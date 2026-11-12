import { FilePurpose, FileStatus, type Prisma } from "@leonly/database/client";
import { IMAGE_VARIANT_NAMES } from "@leonly/utils/contracts";
import { ConflictException } from "@nestjs/common";
import type { ClaimedFile } from "../../files/files.service";
import { IMAGE_ENTITY_TYPE, IMAGE_EVENT_TYPE } from "../constants/memories.constants";

export type MemoryEditScope = { userId: string; spaceId: string; memberId: string };

const PHOTO_CLAIM_CONFLICT = {
  code: "PHOTO_CLAIM_CONFLICT",
  message: "A selected photo is being used by another save. Try again.",
};

function throwPhotoClaimConflict(): never {
  throw new ConflictException({ errors: [PHOTO_CLAIM_CONFLICT] });
}

type ClearRemovedCoverParams = {
  transaction: Prisma.TransactionClient;
  memoryId: string;
  finalSelection: string[];
};

export async function clearRemovedCover({
  transaction,
  memoryId,
  finalSelection,
}: ClearRemovedCoverParams): Promise<void> {
  // The cover references its association row, so a removed cover must be cleared
  // before its association is deleted.
  const memory = await transaction.memory.findFirst({
    where: { id: memoryId },
    select: { coverFileId: true },
  });
  const hasRemovedCover = Boolean(
    memory?.coverFileId && !finalSelection.includes(memory.coverFileId),
  );
  if (!hasRemovedCover) return;

  await transaction.memory.updateMany({
    where: { id: memoryId },
    data: { coverFileId: null },
  });
}

type ReservePositionsParams = {
  transaction: Prisma.TransactionClient;
  scope: MemoryEditScope;
  memoryId: string;
};

export async function reservePositions({
  transaction,
  scope,
  memoryId,
}: ReservePositionsParams): Promise<void> {
  // Positions are non-negative (schema check), so temporary reservations move
  // above the 0..9 final range (at most ten photos per memory) before placement.
  await transaction.$executeRaw`
    UPDATE memory_files mf SET position = 1000 + ordered.row_number
    FROM (
      SELECT file_id, row_number() OVER (ORDER BY position) AS row_number
      FROM memory_files WHERE memory_id = ${memoryId}::uuid AND space_id = ${scope.spaceId}::uuid
    ) AS ordered
    WHERE mf.memory_id = ${memoryId}::uuid AND mf.space_id = ${scope.spaceId}::uuid
      AND mf.file_id = ordered.file_id
  `;
}

type DetachRemovedAttachmentsParams = {
  transaction: Prisma.TransactionClient;
  scope: MemoryEditScope;
  memoryId: string;
  finalSelection: string[];
};

export async function detachRemovedAttachments({
  transaction,
  scope,
  memoryId,
  finalSelection,
}: DetachRemovedAttachmentsParams): Promise<string[]> {
  const removedWhere: Prisma.MemoryFileWhereInput =
    finalSelection.length === 0
      ? { memoryId, spaceId: scope.spaceId }
      : { memoryId, spaceId: scope.spaceId, fileId: { notIn: finalSelection } };

  const removedAttachments = await transaction.memoryFile.findMany({
    where: removedWhere,
    select: { fileId: true },
  });
  if (removedAttachments.length === 0) return [];

  await transaction.memoryFile.deleteMany({
    where: {
      memoryId,
      spaceId: scope.spaceId,
      fileId: { in: removedAttachments.map(({ fileId }) => fileId) },
    },
  });

  return removedAttachments.map(({ fileId }) => fileId);
}

type RetireRemovedFamiliesParams = {
  transaction: Prisma.TransactionClient;
  scope: MemoryEditScope;
  removedRootIds: string[];
};

export async function retireRemovedFamilies({
  transaction,
  scope,
  removedRootIds,
}: RetireRemovedFamiliesParams): Promise<void> {
  if (removedRootIds.length === 0) return;

  await transaction.file.updateMany({
    where: {
      spaceId: scope.spaceId,
      status: { not: FileStatus.deleting },
      OR: [{ id: { in: removedRootIds } }, { originalFileId: { in: removedRootIds } }],
    },
    data: { status: FileStatus.deleting },
  });
}

type PlaceRetainedPhotosParams = {
  transaction: Prisma.TransactionClient;
  memoryId: string;
  retainedSelection: string[];
};

export async function placeRetainedPhotos({
  transaction,
  memoryId,
  retainedSelection,
}: PlaceRetainedPhotosParams): Promise<void> {
  for (const [position, fileId] of retainedSelection.entries()) {
    await transaction.memoryFile.update({
      where: { memoryId_fileId: { memoryId, fileId } },
      data: { position },
    });
  }
}

type AttachUploadsParams = {
  transaction: Prisma.TransactionClient;
  scope: MemoryEditScope;
  memoryId: string;
  firstAddedPosition: number;
  uploads: ClaimedFile[];
};

export async function attachUploads({
  transaction,
  scope,
  memoryId,
  firstAddedPosition,
  uploads,
}: AttachUploadsParams): Promise<string[]> {
  const eventIds: string[] = [];

  for (const [index, upload] of uploads.entries()) {
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
    if (attached.count !== 1) throwPhotoClaimConflict();

    await transaction.memoryFile.create({
      data: {
        memoryId,
        fileId: upload.id,
        spaceId: scope.spaceId,
        position: firstAddedPosition + index,
      },
    });
    const event = await transaction.outboxEvent.create({
      data: {
        entityType: IMAGE_ENTITY_TYPE,
        entityId: upload.id,
        eventType: IMAGE_EVENT_TYPE,
        payload: {
          memoryId,
          spaceId: scope.spaceId,
          variantNames: [...IMAGE_VARIANT_NAMES],
        },
      },
    });
    eventIds.push(event.id);
  }

  return eventIds;
}
