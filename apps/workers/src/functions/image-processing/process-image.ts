import type { PrismaClient } from "@leonly/database/client";
import { type ImageEvent, parseImageEvent } from "@leonly/utils/contracts";
import { ObjectSizeError, type ObjectStorage } from "@leonly/utils/storage";
import type { Logger } from "pino";
import {
  generateVariant,
  ImageProcessingError,
  MAX_ORIGINAL_BYTES,
  MAX_VARIANT_BYTES,
  type Variant,
  validateOriginal,
  verifyVariant,
} from "../../services/image/image-recipe";
import { loadImageAsset, VARIANTS } from "./load-image-asset";
import {
  claimProcessingLease,
  type ProcessingLease,
  releaseProcessingLease,
  updateOwnedObjects,
} from "./processing-lease";

export type ImageDependencies = {
  prisma: PrismaClient;
  storage: Pick<ObjectStorage, "getObject" | "putObjectIfAbsent">;
  logger: Pick<Logger, "info" | "error">;
};

export type ImageOutcome = "completed" | "already_completed" | "unavailable";

export async function processImage(
  value: unknown,
  dependencies: ImageDependencies,
): Promise<ImageOutcome> {
  const event = parseImageEvent(value);
  const { prisma, storage } = dependencies;
  const asset = await loadImageAsset(event, prisma);

  if (!asset) return "unavailable";
  if (asset.isReady) return "already_completed";

  const lease = await claimProcessingLease(event.payload, prisma);

  try {
    await updateOwnedObjects({
      prisma,
      lease,
      changes: { status: "processing", failureCode: null },
    });

    const bytes = await loadOriginalImage({
      storage,
      originalKey: event.payload.originalKey,
      original: asset.original,
    });

    for (const variant of VARIANTS) {
      const object = asset.variants.find(({ variantType }) => variantType === variant);
      if (object?.status === "ready") continue;

      await processVariant({
        bytes,
        variant,
        key: `${asset.baseKey}${variant}.webp`,
        dependencies,
        lease,
      });
    }

    return "completed";
  } catch (error) {
    const processingError = normalizeProcessingError(error);
    await recordProcessingFailure({ error: processingError, event, dependencies, lease });
    throw processingError;
  } finally {
    await releaseProcessingLease(lease, prisma);
  }
}

async function loadOriginalImage({
  storage,
  originalKey,
  original,
}: {
  storage: ImageDependencies["storage"];
  originalKey: string;
  original: { mimeType: string; byteSize: number };
}): Promise<Buffer> {
  const bytes = await storage.getObject(originalKey, MAX_ORIGINAL_BYTES);
  if (!bytes) throw new ImageProcessingError("ORIGINAL_MISSING");

  await validateOriginal(bytes, original);

  return bytes;
}

async function processVariant({
  bytes,
  variant,
  key,
  dependencies: { prisma, storage },
  lease,
}: {
  bytes: Buffer;
  variant: Variant;
  key: string;
  dependencies: ImageDependencies;
  lease: ProcessingLease;
}): Promise<void> {
  const generated = await generateVariant(bytes, variant);
  if (generated.length > MAX_VARIANT_BYTES) throw new ImageProcessingError("VARIANT_TOO_LARGE");

  await storage.putObjectIfAbsent({ key, bytes: generated, contentType: "image/webp" });
  const stored = await storage.getObject(key, MAX_VARIANT_BYTES);
  if (!stored) throw new Error("Uploaded variant unavailable");

  await verifyVariant({ bytes: stored, generated, variant });
  await updateOwnedObjects({
    prisma,
    lease,
    variant,
    changes: {
      status: "ready",
      mimeType: "image/webp",
      byteSize: stored.length,
      readyAt: new Date(),
      failureCode: null,
    },
  });
}

function normalizeProcessingError(error: unknown): unknown {
  return error instanceof ObjectSizeError
    ? new ImageProcessingError("IMAGE_SIZE_LIMIT_EXCEEDED")
    : error;
}

async function recordProcessingFailure({
  error,
  event,
  dependencies: { prisma, logger },
  lease,
}: {
  error: unknown;
  event: ImageEvent;
  dependencies: ImageDependencies;
  lease: ProcessingLease;
}): Promise<void> {
  const isPermanent =
    error instanceof ImageProcessingError &&
    !["PROCESSING_BUSY", "PROCESSING_OWNERSHIP_LOST", "VARIANT_STATE_CHANGED"].includes(error.code);
  const code = error instanceof ImageProcessingError ? error.code : "TRANSIENT_PROCESSING_ERROR";

  try {
    await updateOwnedObjects({
      prisma,
      lease,
      changes: { status: isPermanent ? "failed" : "pending", failureCode: code },
    });
  } catch {
    logger.error({
      event: "image_failure_bookkeeping_failed",
      eventId: event.id,
      assetId: event.payload.assetId,
      code,
    });
  }
}
