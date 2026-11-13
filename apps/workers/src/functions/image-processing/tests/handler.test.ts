import type { Context, SQSEvent } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createAdapter,
  PrismaClient,
  ObjectStorage,
  concurrency,
  cache,
  invocationLogger,
  logger,
  processImageBatch,
} = vi.hoisted(() => ({
  createAdapter: vi.fn(() => ({})),
  PrismaClient: vi.fn(),
  ObjectStorage: vi.fn(),
  concurrency: vi.fn(),
  cache: vi.fn(),
  invocationLogger: { info: vi.fn(), error: vi.fn() },
  logger: { child: vi.fn() },
  processImageBatch: vi.fn(),
}));

vi.mock("@leonly/database", () => ({ PrismaConnection: { createAdapter } }));
vi.mock("@leonly/database/client", () => ({ PrismaClient }));
vi.mock("@leonly/utils/storage", () => ({
  ObjectStorage,
  ObjectSizeError: class extends Error {},
}));
vi.mock("sharp", () => ({ default: { concurrency, cache } }));
vi.mock("../../../lib/logger", () => ({ logger }));
vi.mock("../events/sqs-handler", () => ({ processImageBatch }));

const context = { awsRequestId: "request-id" } as Context;

describe("image Lambda initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logger.child.mockReturnValue(invocationLogger);
  });

  it("reuses initialized clients and Sharp settings across warm invocations", async () => {
    processImageBatch.mockResolvedValue({ batchItemFailures: [] });
    const { handler } = await import("../handler");
    const event = { Records: [] } as SQSEvent;

    await expect(handler(event, context)).resolves.toEqual({ batchItemFailures: [] });
    await expect(handler(event, context)).resolves.toEqual({ batchItemFailures: [] });

    expect(PrismaClient).toHaveBeenCalledTimes(1);
    expect(ObjectStorage).toHaveBeenCalledTimes(1);
    expect(createAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ max: 2, connectionTimeoutMillis: 5_000, query_timeout: 10_000 }),
    );
    expect(concurrency).toHaveBeenCalledTimes(1);
    expect(concurrency).toHaveBeenCalledWith(1);
    expect(cache).toHaveBeenCalledTimes(1);
    expect(cache).toHaveBeenCalledWith(false);
    expect(logger.child).toHaveBeenCalledWith({ awsRequestId: "request-id" });
  });

  it("logs and rethrows batch-level failures with the invocation identifier", async () => {
    const failure = new Error("batch unavailable");
    processImageBatch.mockRejectedValue(failure);
    const { handler } = await import("../handler");
    const event = { Records: [] } as SQSEvent;

    await expect(handler(event, context)).rejects.toBe(failure);

    expect(invocationLogger.error).toHaveBeenCalledWith({
      event: "image_batch_failed",
      recordCount: 0,
      err: failure,
    });
  });
});
