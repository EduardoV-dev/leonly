import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import sharp from "sharp";
import { logger, prisma, storage } from "../../app";
import { processImageBatch } from "./sqs-handler";

sharp.concurrency(1);
sharp.cache(false);

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  return processImageBatch(event, { prisma, storage, logger });
}
