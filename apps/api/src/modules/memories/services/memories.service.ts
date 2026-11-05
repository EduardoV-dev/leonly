import { FilePurpose, FileStatus, Prisma } from "@leonly/database/client";
import { IMAGE_VARIANT_NAMES } from "@leonly/utils/contracts";
import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { OutboxPublisher } from "../../../common/outbox/outbox-publisher";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { type ClaimedFile, FilesService } from "../../files/files.service";
import { MembershipsService } from "../../spaces/services/memberships.service";
import { IMAGE_ENTITY_TYPE, IMAGE_EVENT_TYPE } from "../constants/memories.constants";
import type { CreateMemoryDto } from "../dtos/create-memory.dto";
import {
  throwConflictingCreationError,
  throwCreationInProgressError,
} from "../utils/creation-errors.util";
import { type CreationInput, hashCreation, normalizeCreation } from "../utils/memory-creation.util";

export type CreationResult = { id: string; visibility: "timeline" | "vault" };
type CreationScope = { userId: string; spaceId: string; memberId: string };
type FindExistingCreationParams = { scope: CreationScope; input: CreationInput; hash: string };
type CommitParams = FindExistingCreationParams & { uploads: ClaimedFile[] };
type CreateParams = { userId: string; body: CreateMemoryDto };
type CommitReturn = { result: CreationResult; eventIds: string[] };

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly filesService: FilesService,
    private readonly outboxPublisherService: OutboxPublisher,
    private readonly membershipsService: MembershipsService,
  ) {}

  async create({ userId, body }: CreateParams): Promise<CreationResult> {
    const input = normalizeCreation(body);
    const hash = hashCreation(input);
    const membership = await this.membershipsService.requireActiveMembership(userId);

    const scope = { userId, spaceId: membership.spaceId, memberId: membership.id };
    const existing = await this.findExistingCreation({ scope, input, hash });

    if (existing) return existing;

    const uploads: ClaimedFile[] = [];
    let hasCommittedResult = false;

    try {
      const confirmations = await Promise.all(
        input.uploadIds.map(async (id) => {
          try {
            return {
              status: "fulfilled" as const,
              upload: await this.filesService.confirmUploaded({
                id,
                userId,
                spaceId: scope.spaceId,
                purpose: FilePurpose.memory_image,
              }),
            };
          } catch (error) {
            return { status: "rejected" as const, error };
          }
        }),
      );
      uploads.push(
        ...confirmations.flatMap((confirmation) =>
          confirmation.status === "fulfilled" ? [confirmation.upload] : [],
        ),
      );

      const failedConfirmation = confirmations.find(({ status }) => status === "rejected");
      if (failedConfirmation?.status === "rejected") throw failedConfirmation.error;

      const { result, eventIds } = await this.commit({ scope, input, hash, uploads });
      hasCommittedResult = true;

      if (eventIds.length > 0) {
        try {
          await this.outboxPublisherService.publish({ ids: eventIds, limit: eventIds.length });
        } catch {
          this.logger.warn({ event: "memory_publication_failed", memoryId: result.id, eventIds });
        }
      }

      return result;
    } catch (error) {
      let winner: CreationResult | null = null;

      try {
        winner = await this.findExistingCreation({ scope, input, hash });
      } catch (recoveryError) {
        if (recoveryError instanceof ConflictException) throw recoveryError;
        this.logger.warn({ event: "memory_creation_recovery_lookup_failed" });
        throw error;
      }

      if (winner) {
        hasCommittedResult = true;
        return winner;
      }

      const isTransactionConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(error.code);

      if (isTransactionConflict) throwCreationInProgressError();

      throw error;
    } finally {
      if (!hasCommittedResult) {
        try {
          await this.filesService.release(uploads);
        } catch {
          this.logger.warn({
            event: "upload_claim_release_failed",
            uploadIds: uploads.map(({ id }) => id),
          });
        }
      }
    }
  }

  private async findExistingCreation({
    scope,
    input,
    hash,
  }: FindExistingCreationParams): Promise<CreationResult | null> {
    const existing = await this.prismaService.memory.findUnique({
      where: {
        spaceId_createdByUserId_idempotencyKey: {
          spaceId: scope.spaceId,
          createdByUserId: scope.userId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: { id: true, visibility: true, creationRequestHash: true },
    });

    if (!existing) return null;
    if (existing.creationRequestHash !== hash) throwConflictingCreationError();

    return { id: existing.id, visibility: existing.visibility };
  }

  private async commit({ scope, input, hash, uploads }: CommitParams): Promise<CommitReturn> {
    return this.prismaService.$transaction(async (transaction) => {
      const members = await transaction.$queryRaw<{ id: string }[]>`
        SELECT c.id FROM space_members c JOIN spaces s ON s.id = c.space_id
        WHERE c.id = ${scope.memberId}::uuid AND c.user_id = ${scope.userId}
          AND c.space_id = ${scope.spaceId}::uuid AND c.deleted_at IS NULL AND s.deleted_at IS NULL
        FOR UPDATE OF s, c
      `;

      if (members.length !== 1)
        throw new NotFoundException({ error: "An active space is required." });

      const memory = await transaction.memory.create({
        data: {
          spaceId: scope.spaceId,
          createdByUserId: scope.userId,
          createdByMemberId: scope.memberId,
          title: input.title,
          description: input.description,
          location: input.location,
          memoryDate: new Date(`${input.memoryDate}T00:00:00.000Z`),
          visibility: input.visibility,
          idempotencyKey: input.idempotencyKey,
          creationRequestHash: hash,
        },
        select: { id: true, visibility: true },
      });

      const eventIds: string[] = [];

      for (const [position, upload] of uploads.entries()) {
        const now = new Date();
        const attached = await transaction.file.updateMany({
          where: {
            id: upload.id,
            uploadedByUserId: scope.userId,
            spaceId: scope.spaceId,
            purpose: FilePurpose.memory_image,
            originalFileId: null,
            status: { in: [FileStatus.uploaded, FileStatus.ready] },
            operationLockToken: upload.operationLockToken,
            operationLockExpiresAt: { gt: now },
          },
          data: { operationLockToken: null, operationLockExpiresAt: null },
        });

        if (attached.count !== 1) throwCreationInProgressError();

        await transaction.memoryFile.create({
          data: {
            memoryId: memory.id,
            fileId: upload.id,
            spaceId: scope.spaceId,
            position,
          },
        });
        const event = await transaction.outboxEvent.create({
          data: {
            entityType: IMAGE_ENTITY_TYPE,
            entityId: upload.id,
            eventType: IMAGE_EVENT_TYPE,
            payload: {
              memoryId: memory.id,
              spaceId: scope.spaceId,
              variantNames: [...IMAGE_VARIANT_NAMES],
            },
          },
        });
        eventIds.push(event.id);
      }

      if (input.coverUploadId !== null) {
        await transaction.memory.update({
          where: { id: memory.id },
          data: { coverFileId: input.coverUploadId },
        });
      }

      return { result: memory, eventIds };
    });
  }
}
