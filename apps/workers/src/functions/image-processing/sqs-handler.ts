import { ImageEventError } from "@leonly/utils/contracts";
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import { ImageProcessingError } from "../../services/image/image-recipe";
import { type ImageDependencies, processImage } from "./process-image";

export async function processImageBatch(
  event: SQSEvent,
  dependencies: ImageDependencies,
): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records) {
    let value: unknown;

    try {
      try {
        value = JSON.parse(record.body);
      } catch {
        throw new ImageEventError("INVALID_JSON");
      }

      const outcome = await processImage(value, dependencies);

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

function getIdentity(value: unknown): { eventId?: string; assetId?: string } {
  if (typeof value !== "object" || value === null) return {};

  const event = value as { id?: unknown; payload?: { assetId?: unknown } };
  const uuid = /^[0-9a-f-]{36}$/i;

  return {
    eventId: typeof event.id === "string" && uuid.test(event.id) ? event.id : undefined,
    assetId:
      typeof event.payload?.assetId === "string" && uuid.test(event.payload.assetId)
        ? event.payload.assetId
        : undefined,
  };
}
