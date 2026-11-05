import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import sharp from "sharp";
import { logger } from "../../lib/logger";
import { prisma } from "../../lib/prisma";
import { storage } from "../../lib/storage";
import { processImageBatch } from "./events/sqs-handler";

sharp.concurrency(1);
sharp.cache(false);

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  return processImageBatch(event, { prisma, storage, logger });
}
