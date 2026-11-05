import { type File, FileStatus, type PrismaClient } from "@leonly/database/client";
import { ObjectSizeError } from "@leonly/utils/storage";
import type { Logger } from "pino";
import type { ImageFileContext } from "../repositories/load-image-file";
import {
  claimVariantProcessingLease,
  type ProcessingLease,
  releaseProcessingLease,
  updateOwnedVariantFailure,
} from "../repositories/processing-lease";
import { ImageProcessingError, type Variant } from "./image-recipe";

type FailureDependencies = { prisma: PrismaClient; logger: Pick<Logger, "error"> };

type RecordVariantProcessingFailureParams = {
  error: unknown;
  imageFile: ImageFileContext;
  variantFile: File;
  variantName: Variant;
  rootLease: ProcessingLease;
  variantLease: ProcessingLease;
  dependencies: FailureDependencies;
};

type RecordRootVerificationFailureParams = {
  error: unknown;
  imageFile: ImageFileContext;
  variantFiles: File[];
  rootLease: ProcessingLease;
  dependencies: FailureDependencies;
};

export function normalizeProcessingError(error: unknown): unknown {
  return error instanceof ObjectSizeError
    ? new ImageProcessingError("IMAGE_SIZE_LIMIT_EXCEEDED")
    : error;
}

export async function recordVariantProcessingFailure({
  error,
  imageFile,
  variantFile,
  variantName,
  rootLease,
  variantLease,
  dependencies: { prisma, logger },
}: RecordVariantProcessingFailureParams): Promise<boolean> {
  const isTransient =
    !(error instanceof ImageProcessingError) ||
    [
      "PROCESSING_BUSY",
      "PROCESSING_OWNERSHIP_LOST",
      "ORIGINAL_MISSING",
      "VARIANT_OBJECT_MISSING",
      "VARIANT_STATE_CHANGED",
    ].includes(error.code);
  const code = error instanceof ImageProcessingError ? error.code : "TRANSIENT_PROCESSING_ERROR";

  try {
    await updateOwnedVariantFailure({
      fileId: variantFile.id,
      originalFileId: imageFile.file.id,
      variantName,
      rootLease,
      variantLease,
      data: { ...(isTransient ? {} : { status: FileStatus.failed }), lastErrorCode: code },
      prisma,
    });
    return true;
  } catch {
    logger.error({ event: "image_failure_bookkeeping_failed", fileId: variantFile.id, code });
    return false;
  }
}

export async function recordRootVerificationFailure({
  error,
  imageFile,
  variantFiles,
  rootLease,
  dependencies: { prisma, logger },
}: RecordRootVerificationFailureParams): Promise<void> {
  const isPermanent =
    error instanceof ImageProcessingError &&
    !["PROCESSING_BUSY", "PROCESSING_OWNERSHIP_LOST", "ORIGINAL_MISSING"].includes(error.code);
  let canMarkRootFailed = true;

  for (const variantFile of variantFiles) {
    const variantName = variantFile.variantName;
    if (
      (variantFile.status !== FileStatus.pending && variantFile.status !== FileStatus.uploaded) ||
      (variantName !== "cover" && variantName !== "detail")
    ) {
      continue;
    }

    let variantLease: ProcessingLease | undefined;
    try {
      variantLease = await claimVariantProcessingLease({
        fileId: variantFile.id,
        originalFileId: imageFile.file.id,
        rootLease,
        prisma,
      });
      const failureRecorded = await recordVariantProcessingFailure({
        error,
        imageFile,
        variantFile,
        variantName,
        rootLease,
        variantLease,
        dependencies: { prisma, logger },
      });
      if (!failureRecorded) canMarkRootFailed = false;
    } catch (bookkeepingError) {
      if (
        bookkeepingError instanceof ImageProcessingError &&
        bookkeepingError.code === "PROCESSING_BUSY"
      ) {
        canMarkRootFailed = false;
        continue;
      }

      canMarkRootFailed = false;
      logger.error({
        event: "image_failure_bookkeeping_failed",
        fileId: variantFile.id,
        code:
          bookkeepingError instanceof ImageProcessingError
            ? bookkeepingError.code
            : "IMAGE_FAILURE_BOOKKEEPING_FAILED",
      });
    } finally {
      if (variantLease) {
        try {
          await releaseProcessingLease({ lease: variantLease, prisma });
        } catch {
          logger.error({
            event: "image_failure_release_failed",
            fileId: variantFile.id,
            code: "OPERATION_LOCK_RELEASE_FAILED",
          });
        }
      }
    }
  }

  await prisma.file.updateMany({
    where: {
      id: imageFile.file.id,
      status: FileStatus.uploaded,
      operationLockToken: rootLease.token,
      operationLockExpiresAt: { gt: new Date() },
    },
    data: {
      ...(isPermanent && canMarkRootFailed ? { status: FileStatus.failed } : {}),
      lastErrorCode:
        error instanceof ImageProcessingError ? error.code : "TRANSIENT_PROCESSING_ERROR",
    },
  });
}
