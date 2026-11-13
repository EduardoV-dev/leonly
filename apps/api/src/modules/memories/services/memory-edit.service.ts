import { FilePurpose, FileStatus, Prisma } from "@leonly/database/client";
import { type MemoryEditorSnapshot, type MemoryPlacementResult } from "@leonly/utils/contracts";
import { ObjectStorage } from "@leonly/utils/storage";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  POSTGRES_TIMESTAMP_FORMAT,
  STALE_RESOURCE_MESSAGE,
} from "../../../common/constants/timestamp.constants";
import { OutboxPublisher } from "../../../common/outbox/outbox-publisher";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { type ClaimedFile, FilesService } from "../../files/files.service";
import { MembershipsService } from "../../spaces/services/memberships.service";
import type { EditMemoryDto } from "../dtos/edit-memory.dto";
import { normalizeEditSave } from "../utils/memory-edit.util";
import {
  attachUploads,
  clearRemovedCover,
  detachRemovedAttachments,
  type MemoryEditScope,
  placeRetainedPhotos,
  reservePositions,
  retireRemovedFamilies,
} from "../utils/memory-edit-attachments.util";
import { MemoriesService } from "./memories.service";

type SaveParams = { userId: string; memoryId: string; body: EditMemoryDto };
type GetEditableSnapshotParams = { userId: string; memoryId: string };
type CommitEditParams = {
  scope: MemoryEditScope;
  memoryId: string;
  input: ReturnType<typeof normalizeEditSave>;
  uploads: ClaimedFile[];
};
type CurrentAttachment = { fileId: string; position: number };
type CommitEditReturn = { result: MemoryPlacementResult; eventIds: string[] };

const INVALID_PHOTO_REFERENCE = {
  code: "INVALID_PHOTO_REFERENCE",
  message: "One or more selected photos are unavailable.",
};
const MEMORY_EDIT_CONFLICT = {
  code: "MEMORY_EDIT_CONFLICT",
  message: "The memory changed while saving. Reload it and try again.",
};
const SIGNED_URL_SECONDS = 300;
const EDITOR_PREVIEW_VARIANT = "detail";

function throwInvalidPhotoReference(): never {
  throw new BadRequestException({ errors: [INVALID_PHOTO_REFERENCE] });
}

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)
  );
}

@Injectable()
export class MemoryEditService {
  private readonly logger = new Logger(MemoryEditService.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly filesService: FilesService,
    private readonly outboxPublisherService: OutboxPublisher,
    private readonly membershipsService: MembershipsService,
    private readonly memoriesService: MemoriesService,
    private readonly storage: ObjectStorage,
  ) {}

  async getEditableSnapshot({
    userId,
    memoryId,
  }: GetEditableSnapshotParams): Promise<MemoryEditorSnapshot> {
    const membership = await this.membershipsService.requireActiveMembership({ userId });

    // Placement is intentionally absent: editing works for both Timeline and Vault.
    const scope: Prisma.MemoryWhereInput = {
      spaceId: membership.spaceId,
      deletedAt: null,
      space: { deletedAt: null, members: { some: { id: membership.id, userId, deletedAt: null } } },
    };

    const memory = await this.prismaService.memory.findFirst({
      where: { ...scope, id: memoryId },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        memoryDate: true,
        visibility: true,
        updatedAt: true,
        coverFileId: true,
        memoryFiles: {
          where: { spaceId: membership.spaceId },
          orderBy: { position: "asc" },
          select: {
            fileId: true,
            file: {
              select: {
                status: true,
                variants: {
                  where: {
                    spaceId: membership.spaceId,
                    status: FileStatus.ready,
                    variantName: EDITOR_PREVIEW_VARIANT,
                  },
                  select: { objectKey: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    if (!memory) throw new NotFoundException({ error: "Memory unavailable." });

    const photos = await Promise.all(
      memory.memoryFiles.map(async ({ fileId, file }) => {
        const objectKey = file.variants[0]?.objectKey;
        const isServingRoot =
          file.status === FileStatus.uploaded || file.status === FileStatus.ready;
        const previewUrl =
          objectKey && isServingRoot
            ? await this.storage.signObject({ key: objectKey, expiresIn: SIGNED_URL_SECONDS })
            : null;

        return { id: fileId, previewUrl };
      }),
    );

    return {
      id: memory.id,
      title: memory.title,
      description: memory.description,
      location: memory.location,
      memoryDate: memory.memoryDate.toISOString().slice(0, 10),
      visibility: memory.visibility,
      updatedAt: memory.updatedAt.toISOString(),
      coverFileId: memory.coverFileId,
      photos,
    };
  }

  async save({ userId, memoryId, body }: SaveParams): Promise<MemoryPlacementResult> {
    const input = normalizeEditSave(body);
    const membership = await this.membershipsService.requireActiveMembership({ userId });
    const scope = { userId, spaceId: membership.spaceId, memberId: membership.id };

    await this.memoriesService.requireActiveMemory({ userId, memoryId, membership });

    const uploads: ClaimedFile[] = [];
    let hasCommittedSave = false;

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
            const isUnavailableReference =
              error instanceof NotFoundException || error instanceof ConflictException;

            return {
              status: "rejected" as const,
              uploadId: id,
              error: isUnavailableReference
                ? new BadRequestException({ errors: [INVALID_PHOTO_REFERENCE] })
                : error,
            };
          }
        }),
      );
      uploads.push(
        ...confirmations.flatMap((confirmation) =>
          confirmation.status === "fulfilled" ? [confirmation.upload] : [],
        ),
      );

      const failures = confirmations.filter(
        (confirmation): confirmation is { status: "rejected"; uploadId: string; error: unknown } =>
          confirmation.status === "rejected",
      );
      const [thrownFailure, ...droppedFailures] = failures;

      for (const { uploadId, error } of droppedFailures) {
        if (error instanceof BadRequestException) continue;

        this.logger.warn({
          event: "upload_confirmation_failed",
          uploadId,
          outcome: "failed",
          err: error,
        });
      }

      if (thrownFailure) throw thrownFailure.error;

      const { result, eventIds } = await this.commitEdit({ scope, memoryId, input, uploads });
      hasCommittedSave = true;

      if (eventIds.length > 0) {
        try {
          await this.outboxPublisherService.publish({ ids: eventIds, limit: eventIds.length });
        } catch (error) {
          // A committed save never reports rollback for later publication failure.
          this.logger.warn({
            event: "memory_edit_publication_failed",
            memoryId,
            eventIds,
            outcome: "uncertain",
            err: error,
          });
        }
      }

      return result;
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new ConflictException({ errors: [MEMORY_EDIT_CONFLICT] });
      }

      throw error;
    } finally {
      if (!hasCommittedSave) {
        try {
          await this.filesService.release(uploads);
        } catch (releaseError) {
          this.logger.warn({
            event: "upload_claim_release_failed",
            uploadIds: uploads.map(({ id }) => id),
            outcome: "failed",
            err: releaseError,
          });
        }
      }
    }
  }

  private async commitEdit({
    scope,
    memoryId,
    input,
    uploads,
  }: CommitEditParams): Promise<CommitEditReturn> {
    return this.prismaService.$transaction(async (transaction) => {
      const members = await transaction.$queryRaw<{ id: string }[]>`
        SELECT c.id FROM space_members c JOIN spaces s ON s.id = c.space_id
        WHERE c.id = ${scope.memberId}::uuid AND c.user_id = ${scope.userId}
          AND c.space_id = ${scope.spaceId}::uuid AND c.deleted_at IS NULL AND s.deleted_at IS NULL
        FOR UPDATE OF s, c
      `;
      if (members.length !== 1)
        throw new NotFoundException({ error: "An active space is required." });

      // The conditional update is the lifecycle serialization boundary: identity,
      // availability, and the exact submitted token are matched atomically.
      const matched = await transaction.$queryRaw<MemoryPlacementResult[]>`
        UPDATE memories SET
          title = ${input.title},
          description = ${input.description},
          location = ${input.location},
          memory_date = ${input.memoryDate}::date,
          visibility = ${input.visibility}::memory_visibility
        WHERE id = ${memoryId}::uuid AND updated_at = ${input.lastKnownUpdatedAt}::timestamptz
          AND space_id = ${scope.spaceId}::uuid AND deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM space_members sm JOIN spaces s ON s.id = sm.space_id
            WHERE sm.id = ${scope.memberId}::uuid AND sm.user_id = ${scope.userId}
              AND sm.space_id = memories.space_id AND sm.deleted_at IS NULL AND s.deleted_at IS NULL
          )
        RETURNING id, visibility, to_char(updated_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "updatedAt"
      `;
      if (!matched[0]) await this.resolveZeroMatchedRows({ scope, memoryId });

      const currentAttachments = await transaction.$queryRaw<CurrentAttachment[]>`
        SELECT file_id AS "fileId", position FROM memory_files
        WHERE memory_id = ${memoryId}::uuid AND space_id = ${scope.spaceId}::uuid
        ORDER BY position
      `;
      const attachedIds = new Set(currentAttachments.map(({ fileId }) => fileId));
      if (input.retainedPhotoIds.some((id) => !attachedIds.has(id))) throwInvalidPhotoReference();

      // Retained photos keep their persisted relative order; additions follow in
      // file-selection order.
      const retainedSelection = currentAttachments
        .filter(({ fileId }) => input.retainedPhotoIds.includes(fileId))
        .map(({ fileId }) => fileId);
      const finalSelection = [...retainedSelection, ...uploads.map(({ id }) => id)];

      await clearRemovedCover({ transaction, memoryId, finalSelection });
      await reservePositions({ transaction, scope, memoryId });
      const removedRootIds = await detachRemovedAttachments({
        transaction,
        scope,
        memoryId,
        finalSelection,
      });
      await retireRemovedFamilies({ transaction, scope, removedRootIds });
      await placeRetainedPhotos({ transaction, memoryId, retainedSelection });
      const eventIds = await attachUploads({
        transaction,
        scope,
        memoryId,
        firstAddedPosition: retainedSelection.length,
        uploads,
      });

      if (input.coverFileId !== null) {
        await transaction.memory.update({
          where: { id: memoryId },
          data: { coverFileId: input.coverFileId },
        });
      }

      const persisted = await transaction.$queryRaw<{ updatedAt: string }[]>`
        SELECT to_char(updated_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "updatedAt"
        FROM memories WHERE id = ${memoryId}::uuid
      `;

      return {
        result: {
          id: memoryId,
          visibility: matched[0].visibility,
          updatedAt: persisted[0].updatedAt,
        },
        eventIds,
      };
    });
  }

  private async resolveZeroMatchedRows({
    scope,
    memoryId,
  }: {
    scope: MemoryEditScope;
    memoryId: string;
  }): Promise<never> {
    // Deletion may have committed while this update waited on the memory row; recheck
    // availability so the save reports unavailable instead of a stale conflict.
    const membership = await this.membershipsService.requireActiveMembership({
      userId: scope.userId,
    });

    try {
      await this.memoriesService.requireActiveMemory({
        userId: scope.userId,
        memoryId,
        membership,
      });
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;

      throw new NotFoundException({ error: "Memory unavailable." });
    }

    throw new ConflictException({ error: STALE_RESOURCE_MESSAGE });
  }
}
