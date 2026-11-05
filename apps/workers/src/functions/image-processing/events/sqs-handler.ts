import { FileStatus, type PrismaClient } from "@leonly/database/client";
import { type ImageEvent, ImageEventError, parseImageEvent } from "@leonly/utils/contracts";
import type { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { loadImageFile } from "../repositories/load-image-file";
import { ImageProcessingError } from "../services/image-recipe";
import { type ImageDependencies, processImage } from "../services/process-image";

// Keep aligned with the SQS redrive policy in infra/modules/image-queue/main.tf.
const MAX_IMAGE_RECEIVE_COUNT = 5;
const EXHAUSTED_RETRIES_ERROR_CODE = "PROCESSING_RETRIES_EXHAUSTED";

export async function processImageBatch(
  event: SQSEvent,
  dependencies: ImageDependencies,
): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records) {
    let value: unknown;
    let imageEvent: ImageEvent | undefined;

    try {
      try {
        value = JSON.parse(record.body);
      } catch {
        throw new ImageEventError("INVALID_JSON");
      }

      imageEvent = parseImageEvent(value);
      const outcome = await processImage({ value: imageEvent, dependencies });

      dependencies.logger.info({
        event: "image_processed",
        messageId: record.messageId,
        ...getIdentity(value),
        outcome,
      });
    } catch (error) {
      const code =
        error instanceof ImageEventError || error instanceof ImageProcessingError
          ? error.code
          : "TRANSIENT_PROCESSING_ERROR";

      if (imageEvent && hasExhaustedRetryBudget(record)) {
        try {
          await markExhaustedVariantsFailed({ event: imageEvent, prisma: dependencies.prisma });
        } catch {
          dependencies.logger.error({
            event: "image_exhausted_failure_bookkeeping_failed",
            eventId: imageEvent.id,
            fileId: imageEvent.entityId,
            code: EXHAUSTED_RETRIES_ERROR_CODE,
          });
        }
      }

      dependencies.logger.error({
        event: "image_processing_failed",
        messageId: record.messageId,
        ...getIdentity(value),
        code,
      });

      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}

function hasExhaustedRetryBudget(record: SQSRecord): boolean {
  const receiveCount = Number(record.attributes?.ApproximateReceiveCount);

  return Number.isSafeInteger(receiveCount) && receiveCount >= MAX_IMAGE_RECEIVE_COUNT;
}

async function markExhaustedVariantsFailed({
  event,
  prisma,
}: {
  event: ImageEvent;
  prisma: PrismaClient;
}): Promise<void> {
  const imageFile = await loadImageFile(event, prisma);
  if (!imageFile) return;

  await prisma.file.updateMany({
    where: {
      originalFileId: imageFile.file.id,
      spaceId: imageFile.file.spaceId,
      variantName: { in: event.payload.variantNames },
      status: { in: [FileStatus.pending, FileStatus.uploaded] },
      OR: [{ operationLockToken: null }, { operationLockExpiresAt: { lte: new Date() } }],
    },
    data: {
      status: FileStatus.failed,
      lastErrorCode: EXHAUSTED_RETRIES_ERROR_CODE,
      operationLockToken: null,
      operationLockExpiresAt: null,
    },
  });
  await prisma.file.updateMany({
    where: {
      id: imageFile.file.id,
      status: FileStatus.uploaded,
      OR: [{ operationLockToken: null }, { operationLockExpiresAt: { lte: new Date() } }],
    },
    data: {
      status: FileStatus.failed,
      lastErrorCode: EXHAUSTED_RETRIES_ERROR_CODE,
      operationLockToken: null,
      operationLockExpiresAt: null,
    },
  });
}

function getIdentity(value: unknown): { eventId?: string; fileId?: string } {
  if (typeof value !== "object" || value === null) return {};

  const event = value as { id?: unknown; entityId?: unknown };
  const uuid = /^[0-9a-f-]{36}$/i;

  return {
    eventId: typeof event.id === "string" && uuid.test(event.id) ? event.id : undefined,
    fileId:
      typeof event.entityId === "string" && uuid.test(event.entityId) ? event.entityId : undefined,
  };
}
