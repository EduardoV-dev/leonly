import { type File as FileRecord, FileStatus, type PrismaClient } from "@leonly/database/client";
import type { ImageEvent, ImageVariantName } from "@leonly/utils/contracts";
import type { ObjectStorage } from "@leonly/utils/storage";
import type { Logger } from "pino";
import { type ImageFileContext, loadImageFile } from "../repositories/load-image-file";
import {
  claimRootProcessingLease,
  claimVariantProcessingLease,
  type ProcessingLease,
  releaseProcessingLease,
  updateOwnedVariant,
} from "../repositories/processing-lease";
import {
  generateVariant,
  ImageProcessingError,
  MAX_VARIANT_BYTES,
  type Variant,
  verifyVariant,
} from "./image-recipe";
import { prepareOriginal } from "./prepare-original";
import {
  normalizeProcessingError,
  recordRootVerificationFailure,
  recordVariantProcessingFailure,
} from "./processing-failures";

export type ImageDependencies = {
  prisma: PrismaClient;
  storage: Pick<ObjectStorage, "getObject" | "putObjectIfAbsent">;
  logger: Pick<Logger, "info" | "error">;
};

export type ImageOutcome = "completed" | "already_completed" | "unavailable";

type ProcessImageParams = { value: ImageEvent; dependencies: ImageDependencies };

type EnsureVariantFilesParams = {
  imageFile: ImageFileContext;
  variantNames: ImageVariantName[];
  rootLease: ProcessingLease;
  prisma: PrismaClient;
};

type ProcessVariantParams = {
  bytes: Buffer;
  imageFile: ImageFileContext;
  variantFile: FileRecord;
  variantName: Variant;
  rootLease: ProcessingLease;
  dependencies: ImageDependencies;
};

type GetVariantObjectKeyParams = {
  originalObjectKey: string;
  variantName: ImageVariantName;
};

export async function processImage({
  value: event,
  dependencies,
}: ProcessImageParams): Promise<ImageOutcome> {
  const { prisma } = dependencies;
  const imageFile = await loadImageFile(event, prisma);

  if (!imageFile) return "unavailable";

  const rootLease = await claimRootProcessingLease({ fileId: imageFile.file.id, prisma });
  let outcome: ImageOutcome;

  try {
    const variantFiles = await ensureVariantFiles({
      imageFile,
      variantNames: event.payload.variantNames,
      rootLease,
      prisma,
    });
    const areRequestedVariantsReady = variantFiles.every(
      ({ status }) => status === FileStatus.ready,
    );

    if (areRequestedVariantsReady) {
      outcome = "already_completed";
    } else {
      let bytes: Buffer;
      try {
        bytes = await prepareOriginal({ imageFile, rootLease, dependencies });
      } catch (error) {
        const processingError = normalizeProcessingError(error);
        try {
          await recordRootVerificationFailure({
            error: processingError,
            imageFile,
            variantFiles,
            rootLease,
            dependencies,
          });
        } catch (bookkeepingError) {
          dependencies.logger.error({
            event: "image_failure_bookkeeping_failed",
            fileId: imageFile.file.id,
            code:
              processingError instanceof ImageProcessingError
                ? processingError.code
                : "TRANSIENT_PROCESSING_ERROR",
            err: bookkeepingError,
          });
        }
        throw processingError;
      }

      for (const [index, variantFile] of variantFiles.entries()) {
        const variantName = event.payload.variantNames[index];
        if (!variantName) throw new ImageProcessingError("VARIANT_METADATA_MISMATCH");
        if (variantFile.status === FileStatus.ready) continue;

        await processVariant({
          bytes,
          imageFile,
          variantFile,
          variantName,
          rootLease,
          dependencies,
        });
      }

      outcome = "completed";
    }
  } catch (error) {
    const processingError = normalizeProcessingError(error);
    try {
      await releaseProcessingLease({ lease: rootLease, prisma });
    } catch (releaseError) {
      dependencies.logger.error({
        event: "image_failure_release_failed",
        fileId: imageFile.file.id,
        code: "OPERATION_LOCK_RELEASE_FAILED",
        err: releaseError,
      });
    }
    throw processingError;
  }

  await releaseProcessingLease({ lease: rootLease, prisma });
  return outcome;
}

async function ensureVariantFiles({
  imageFile,
  variantNames,
  rootLease,
  prisma,
}: EnsureVariantFilesParams): Promise<FileRecord[]> {
  const { file: original } = imageFile;

  return prisma.$transaction(async (transaction) => {
    const ownedRoot = await transaction.file.updateMany({
      where: {
        id: original.id,
        spaceId: original.spaceId,
        originalFileId: null,
        status: { in: [FileStatus.uploaded, FileStatus.ready] },
        operationLockToken: rootLease.token,
        operationLockExpiresAt: { gt: new Date() },
      },
      data: { operationLockExpiresAt: rootLease.expiresAt },
    });

    if (ownedRoot.count !== 1) throw new ImageProcessingError("PROCESSING_OWNERSHIP_LOST");

    const variantFiles: FileRecord[] = [];

    for (const variantName of variantNames) {
      const expectedObjectKey = getVariantObjectKey({
        originalObjectKey: original.objectKey,
        variantName,
      });
      const existing = await transaction.file.findFirst({
        where: { originalFileId: original.id, spaceId: original.spaceId, variantName },
      });

      if (existing) {
        validateVariantFile({
          variantFile: existing,
          original,
          variantName,
          expectedObjectKey,
        });
        variantFiles.push(existing);
        continue;
      }

      const variantFile = await transaction.file.create({
        data: {
          spaceId: original.spaceId,
          uploadedByUserId: original.uploadedByUserId,
          originalFileId: original.id,
          variantName,
          objectKey: expectedObjectKey,
          originalFilename: null,
          mimeType: "image/webp",
          sizeBytes: null,
          purpose: original.purpose,
          status: FileStatus.pending,
        },
      });
      variantFiles.push(variantFile);
    }

    return variantFiles;
  });
}

function validateVariantFile({
  variantFile,
  original,
  variantName,
  expectedObjectKey,
}: {
  variantFile: FileRecord;
  original: ImageFileContext["file"];
  variantName: ImageVariantName;
  expectedObjectKey: string;
}): void {
  const hasValidIdentity =
    variantFile.originalFileId === original.id &&
    variantFile.variantName === variantName &&
    variantFile.spaceId === original.spaceId &&
    variantFile.uploadedByUserId === original.uploadedByUserId &&
    variantFile.objectKey === expectedObjectKey &&
    variantFile.purpose === original.purpose;
  const hasValidStatus =
    variantFile.status === FileStatus.pending ||
    variantFile.status === FileStatus.uploaded ||
    variantFile.status === FileStatus.ready;
  const hasValidReadyMetadata =
    variantFile.status !== FileStatus.ready ||
    (variantFile.mimeType === "image/webp" &&
      variantFile.sizeBytes !== null &&
      variantFile.sizeBytes > 0n &&
      variantFile.sizeBytes <= BigInt(MAX_VARIANT_BYTES));

  if (!hasValidIdentity || !hasValidStatus || !hasValidReadyMetadata) {
    throw new ImageProcessingError("VARIANT_METADATA_MISMATCH");
  }
}

function getVariantObjectKey({
  originalObjectKey,
  variantName,
}: GetVariantObjectKeyParams): string {
  const originalSuffix = originalObjectKey.endsWith("/original.webp")
    ? "/original.webp"
    : "/original";
  if (!originalObjectKey.endsWith(originalSuffix)) {
    throw new ImageProcessingError("FILE_METADATA_MISMATCH");
  }

  return `${originalObjectKey.slice(0, -originalSuffix.length)}/${variantName}.webp`;
}

async function processVariant({
  bytes,
  imageFile,
  variantFile,
  variantName,
  rootLease,
  dependencies: { prisma, storage, logger },
}: ProcessVariantParams): Promise<void> {
  const variantLease = await claimVariantProcessingLease({
    fileId: variantFile.id,
    originalFileId: imageFile.file.id,
    rootLease,
    prisma,
  });

  try {
    const generated = await generateVariant(bytes, variantName);
    if (generated.length > MAX_VARIANT_BYTES) throw new ImageProcessingError("VARIANT_TOO_LARGE");

    await storage.putObjectIfAbsent({
      key: variantFile.objectKey,
      bytes: generated,
      contentType: "image/webp",
    });
    const stored = await storage.getObject({
      key: variantFile.objectKey,
      maxBytes: MAX_VARIANT_BYTES,
    });
    if (!stored) throw new ImageProcessingError("VARIANT_OBJECT_MISSING");

    await verifyVariant({ bytes: stored, generated, variant: variantName });
    await updateOwnedVariant({
      fileId: variantFile.id,
      originalFileId: imageFile.file.id,
      variantName,
      rootLease,
      variantLease,
      mimeType: "image/webp",
      sizeBytes: stored.length,
      prisma,
    });
  } catch (error) {
    const processingError = normalizeProcessingError(error);
    try {
      await recordVariantProcessingFailure({
        error: processingError,
        imageFile,
        variantFile,
        variantName,
        rootLease,
        variantLease,
        dependencies: { prisma, logger },
      });
    } finally {
      try {
        await releaseProcessingLease({ lease: variantLease, prisma });
      } catch (releaseError) {
        logger.error({
          event: "image_failure_release_failed",
          fileId: variantFile.id,
          originalFileId: imageFile.file.id,
          variantName,
          code: "OPERATION_LOCK_RELEASE_FAILED",
          err: releaseError,
        });
      }
    }
    throw processingError;
  }

  await releaseProcessingLease({ lease: variantLease, prisma });
}
