import type { Context, SQSBatchResponse, SQSEvent } from "aws-lambda";
import sharp from "sharp";
import { logger } from "../../lib/logger";
import { prisma } from "../../lib/prisma";
import { storage } from "../../lib/storage";
import { processImageBatch } from "./events/sqs-handler";

sharp.concurrency(1);
sharp.cache(false);

export async function handler(event: SQSEvent, context: Context): Promise<SQSBatchResponse> {
  const invocationLogger = logger.child({ awsRequestId: context.awsRequestId });

  try {
    return await processImageBatch(event, { prisma, storage, logger: invocationLogger });
  } catch (error) {
    invocationLogger.error({
      event: "image_batch_failed",
      recordCount: event.Records.length,
      err: error,
    });
    throw error;
  }
}
