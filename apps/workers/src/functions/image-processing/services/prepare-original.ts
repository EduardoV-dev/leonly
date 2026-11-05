import { FileStatus } from "@leonly/database/client";
import sharp from "sharp";
import type { ImageFileContext } from "../repositories/load-image-file";
import { type ProcessingLease, renewRootLease } from "../repositories/processing-lease";
import {
  ImageProcessingError,
  MAX_INPUT_PIXELS,
  MAX_ORIGINAL_BYTES,
  MAX_VARIANT_BYTES,
  validateOriginal,
} from "./image-recipe";
import type { ImageDependencies } from "./process-image";

export const UPLOAD_SOURCE_VARIANT = "upload_source";
const ORIGINAL_WEBP_QUALITY = 90;

type PrepareOriginalParams = {
  imageFile: ImageFileContext;
  rootLease: ProcessingLease;
  dependencies: ImageDependencies;
};

export async function prepareOriginal({
  imageFile,
  rootLease,
  dependencies: { prisma, storage },
}: PrepareOriginalParams): Promise<Buffer> {
  const { file, originalByteSize } = imageFile;
  const source = await prisma.file.findFirst({
    where: { originalFileId: file.id, variantName: UPLOAD_SOURCE_VARIANT },
  });
  const key = source?.objectKey ?? file.objectKey;
  const bytes = await storage.getObject({
    key,
    maxBytes: file.status === FileStatus.ready && !source ? MAX_VARIANT_BYTES : MAX_ORIGINAL_BYTES,
  });
  if (!bytes) throw new ImageProcessingError("ORIGINAL_MISSING");
  await validateOriginal(bytes, {
    mimeType: source?.mimeType ?? file.mimeType,
    byteSize: source ? Number(source.sizeBytes) : originalByteSize,
  });
  if (file.status === FileStatus.ready) return bytes;

  const generated = await sharp(bytes, { failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS })
    .autoOrient()
    .webp({ quality: ORIGINAL_WEBP_QUALITY })
    .toBuffer();
  if (generated.length > MAX_VARIANT_BYTES)
    throw new ImageProcessingError("ORIGINAL_OUTPUT_TOO_LARGE");
  const objectKey = `${file.objectKey}.webp`;
  await renewRootLease({ lease: rootLease, prisma });
  await storage.putObjectIfAbsent({ key: objectKey, bytes: generated, contentType: "image/webp" });
  const stored = await storage.getObject({ key: objectKey, maxBytes: MAX_VARIANT_BYTES });
  if (!stored) throw new ImageProcessingError("ORIGINAL_MISSING");
  if (!stored.equals(generated)) throw new ImageProcessingError("ORIGINAL_CONTENT_CONFLICT");

  await prisma.$transaction(async (transaction) => {
    await renewRootLease({ lease: rootLease, prisma: transaction });
    const updated = await transaction.file.updateMany({
      where: {
        id: file.id,
        status: FileStatus.uploaded,
        objectKey: file.objectKey,
        operationLockToken: rootLease.token,
        operationLockExpiresAt: { gt: new Date() },
      },
      data: {
        status: FileStatus.ready,
        objectKey,
        mimeType: "image/webp",
        sizeBytes: BigInt(stored.length),
        lastErrorCode: null,
      },
    });
    if (updated.count !== 1) throw new ImageProcessingError("PROCESSING_OWNERSHIP_LOST");
    // Keep source attribution until scheduled removal after upload authorization expires.
    await transaction.file.create({
      data: {
        originalFileId: file.id,
        variantName: UPLOAD_SOURCE_VARIANT,
        spaceId: file.spaceId,
        uploadedByUserId: file.uploadedByUserId,
        objectKey: file.objectKey,
        originalFilename: null,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        purpose: file.purpose,
        status: FileStatus.deleting,
        createdAt: file.createdAt,
      },
    });
  });

  return bytes;
}
