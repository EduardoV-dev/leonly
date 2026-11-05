import { FilePurpose, FileStatus, type Prisma, type PrismaClient } from "@leonly/database/client";
import { IMAGE_VARIANT_NAMES, type ImageEvent } from "@leonly/utils/contracts";
import {
  ImageProcessingError,
  MAX_ORIGINAL_BYTES,
  MAX_VARIANT_BYTES,
} from "../services/image-recipe";

export const VARIANTS = IMAGE_VARIANT_NAMES;

type ImageFile = Prisma.FileGetPayload<{
  include: { space: true; memoryFiles: { include: { memory: { include: { space: true } } } } };
}>;

export type ImageFileContext = {
  file: ImageFile;
  originalByteSize: number;
};

export async function loadImageFile(
  event: ImageEvent,
  prisma: PrismaClient,
): Promise<ImageFileContext | null> {
  const file = await prisma.file.findUnique({
    where: { id: event.entityId },
    include: { space: true, memoryFiles: { include: { memory: { include: { space: true } } } } },
  });

  if (!file || file.status === FileStatus.failed || file.status === FileStatus.deleting)
    return null;
  if (file.space.deletedAt) return null;

  const attachment = file.memoryFiles.find(
    ({ memoryId, spaceId }) =>
      memoryId === event.payload.memoryId && spaceId === event.payload.spaceId,
  );

  if (!attachment) {
    if (file.memoryFiles.length === 0) return null;
    throw new ImageProcessingError("FILE_CONTEXT_MISMATCH");
  }

  if (attachment.memory.deletedAt || attachment.memory.space.deletedAt) return null;

  const expectedOriginalKey = `memories/${event.payload.spaceId}/${file.id}/original`;
  const hasValidRootIdentity =
    file.spaceId === event.payload.spaceId &&
    file.originalFileId === null &&
    file.variantName === null &&
    (file.status === FileStatus.uploaded || file.status === FileStatus.ready) &&
    file.purpose === FilePurpose.memory_image &&
    (file.objectKey === expectedOriginalKey ||
      (file.status === FileStatus.ready && file.objectKey === `${expectedOriginalKey}.webp`));
  const hasValidMimeType = ["image/jpeg", "image/png", "image/webp"].includes(file.mimeType);
  const hasValidSize =
    file.sizeBytes !== null &&
    file.sizeBytes > 0n &&
    file.sizeBytes <=
      BigInt(file.status === FileStatus.ready ? MAX_VARIANT_BYTES : MAX_ORIGINAL_BYTES);

  if (!hasValidRootIdentity || !hasValidMimeType || !hasValidSize)
    throw new ImageProcessingError("FILE_METADATA_MISMATCH");

  return { file, originalByteSize: Number(file.sizeBytes) };
}
