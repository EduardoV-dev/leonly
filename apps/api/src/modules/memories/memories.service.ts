import { Prisma } from "@leonly/database/client";
import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { OutboxPublisher } from "../../common/outbox/outbox-publisher";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  type FinalizedUpload,
  UploadFinalizationService,
} from "../files/upload-finalization.service";
import { throwConflictingCreationError, throwCreationInProgressError } from "./creation-errors";
import { type CreationInput, hashCreation, normalizeCreation } from "./creation-validation";

export type CreationResult = { id: string; visibility: "timeline" | "vault" };
type CreationScope = { userId: string; spaceId: string; memberId: string };
type FindExistingCreationParams = { scope: CreationScope; input: CreationInput; hash: string };
type CommitParams = FindExistingCreationParams & { uploads: FinalizedUpload[] };

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly uploadFinalizationService: UploadFinalizationService,
    private readonly outboxPublisher: OutboxPublisher,
  ) {}

  async create({ userId, body }: { userId: string; body: unknown }): Promise<CreationResult> {
    const input = normalizeCreation(body);
    const hash = hashCreation(input);
    const membership = await this.prismaService.spaceMember.findFirst({
      where: { userId, deletedAt: null, space: { deletedAt: null } },
      select: { id: true, spaceId: true },
    });

    if (!membership) throw new NotFoundException({ error: "An active space is required." });

    const scope = { userId, spaceId: membership.spaceId, memberId: membership.id };
    const existing = await this.findExistingCreation({ scope, input, hash });

    if (existing) return existing;

    const uploads: FinalizedUpload[] = [];
    let hasCommittedResult = false;

    try {
      for (const id of input.uploadIds) {
        uploads.push(
          await this.uploadFinalizationService.finalize({ id, userId, spaceId: scope.spaceId }),
        );
      }

      const { result, eventIds } = await this.commit({ scope, input, hash, uploads });
      hasCommittedResult = true;

      if (eventIds.length > 0) {
        try {
          await this.outboxPublisher.publish({ ids: eventIds, limit: eventIds.length });
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
          await this.uploadFinalizationService.release(uploads);
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

  private async commit({
    scope,
    input,
    hash,
    uploads,
  }: CommitParams): Promise<{ result: CreationResult; eventIds: string[] }> {
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
        const consumed = await transaction.fileUpload.updateMany({
          where: {
            id: upload.id,
            uploaderUserId: scope.userId,
            spaceId: scope.spaceId,
            category: "image",
            purpose: "memory_image",
            status: "finalized",
            leaseToken: upload.leaseToken,
            leaseExpiresAt: { gt: now },
            attachmentDeadline: { gt: now },
            verifiedMimeType: upload.verifiedMimeType,
            verifiedByteSize: upload.verifiedByteSize,
          },
          data: { status: "consumed", consumedAt: now, leaseToken: null, leaseExpiresAt: null },
        });

        if (consumed.count !== 1) throwCreationInProgressError();

        await transaction.memoryAsset.create({
          data: {
            id: upload.id,
            memoryId: memory.id,
            spaceId: scope.spaceId,
            uploadId: upload.id,
            position,
            generationRecipeVersion: 1,
          },
        });

        // Remove the "original" suffix to build sibling variant keys.
        const baseKey = upload.intendedFinalKey.slice(0, -"original".length);

        await transaction.memoryAssetObject.createMany({
          data: [
            {
              assetId: upload.id,
              variantType: "original",
              objectPath: upload.intendedFinalKey,
              status: "ready",
              mimeType: upload.verifiedMimeType,
              byteSize: upload.verifiedByteSize,
              readyAt: now,
            },
            {
              assetId: upload.id,
              variantType: "cover",
              objectPath: `${baseKey}cover.webp`,
              status: "pending",
            },
            {
              assetId: upload.id,
              variantType: "detail",
              objectPath: `${baseKey}detail.webp`,
              status: "pending",
            },
          ],
        });
        const event = await transaction.outboxEvent.create({
          data: {
            aggregateType: "memory_asset",
            aggregateId: upload.id,
            eventType: "ImageVariantsRequested",
            schemaVersion: 1,
            payload: {
              memoryId: memory.id,
              spaceId: scope.spaceId,
              assetId: upload.id,
              originalKey: upload.intendedFinalKey,
              generationRecipeVersion: 1,
            },
          },
        });
        eventIds.push(event.id);
      }

      if (input.coverUploadId !== null) {
        await transaction.memory.update({
          where: { id: memory.id },
          data: { coverAssetId: input.coverUploadId },
        });
      }

      return { result: memory, eventIds };
    });
  }
}
