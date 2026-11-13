import { FileStatus, type PrismaClient } from "@leonly/database/client";
import { type ImageEvent, ImageEventError, parseImageEvent } from "@leonly/utils/contracts";
import type { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import type { Logger } from "pino";
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
    const isFailedRecord = await processRecord(record, dependencies);
    if (isFailedRecord) batchItemFailures.push({ itemIdentifier: record.messageId });
  }

  return { batchItemFailures };
}

async function processRecord(record: SQSRecord, dependencies: ImageDependencies): Promise<boolean> {
  const startedAt = Date.now();
  const receiveCount = parseReceiveCount(record.attributes?.ApproximateReceiveCount);
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
      eventId: imageEvent.id,
      fileId: imageEvent.entityId,
      ...(receiveCount !== undefined ? { receiveCount } : {}),
      durationMs: elapsedSince(startedAt),
      outcome,
    });
    return false;
  } catch (error) {
    return handleFailedRecord({
      error,
      record,
      receiveCount,
      startedAt,
      dependencies,
      value,
      imageEvent,
    });
  }
}

type FailedRecordParams = {
  error: unknown;
  record: SQSRecord;
  receiveCount?: number;
  startedAt: number;
  dependencies: ImageDependencies;
  value: unknown;
  imageEvent: ImageEvent | undefined;
};

async function handleFailedRecord({
  error,
  record,
  receiveCount,
  startedAt,
  dependencies,
  value,
  imageEvent,
}: FailedRecordParams): Promise<boolean> {
  const hasExhaustedRetryBudget = hasExhaustedBudget(record);
  const code =
    error instanceof ImageEventError || error instanceof ImageProcessingError
      ? error.code
      : "TRANSIENT_PROCESSING_ERROR";

  if (imageEvent && hasExhaustedRetryBudget) {
    await markExhaustedVariantsFailed({
      event: imageEvent,
      prisma: dependencies.prisma,
      logger: dependencies.logger,
    });
  }

  dependencies.logger.error({
    event: "image_processing_failed",
    messageId: record.messageId,
    ...(imageEvent ? { eventId: imageEvent.id, fileId: imageEvent.entityId } : getIdentity(value)),
    ...(receiveCount !== undefined ? { receiveCount } : {}),
    durationMs: elapsedSince(startedAt),
    code,
    outcome: hasExhaustedRetryBudget ? "retries_exhausted" : "retryable_failure",
    err: error,
  });

  return true;
}

function parseReceiveCount(value: string | undefined): number | undefined {
  const receiveCount = Number(value);
  return Number.isSafeInteger(receiveCount) && receiveCount > 0 ? receiveCount : undefined;
}

function elapsedSince(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

function hasExhaustedBudget(record: SQSRecord): boolean {
  const receiveCount = Number(record.attributes?.ApproximateReceiveCount);

  return Number.isSafeInteger(receiveCount) && receiveCount >= MAX_IMAGE_RECEIVE_COUNT;
}

async function markExhaustedVariantsFailed({
  event,
  prisma,
  logger,
}: {
  event: ImageEvent;
  prisma: PrismaClient;
  logger: Pick<Logger, "error">;
}): Promise<void> {
  try {
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
  } catch (error) {
    logger.error({
      event: "image_exhausted_failure_bookkeeping_failed",
      eventId: event.id,
      fileId: event.entityId,
      code: EXHAUSTED_RETRIES_ERROR_CODE,
      err: error,
    });
  }
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
