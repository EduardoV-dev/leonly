import type { SQSEvent } from "aws-lambda";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processImage } from "../services/process-image";
import { createWorkerFixtures } from "../tests/worker-fixtures";
import { processImageBatch } from "./sqs-handler";

describe("SQS image event handling", () => {
  let fixtures: Awaited<ReturnType<typeof createWorkerFixtures>>;

  beforeEach(async () => {
    const bytes = await sharp({
      create: { width: 1800, height: 900, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    fixtures = await createWorkerFixtures(bytes);
  });

  afterEach(() => vi.useRealTimers());

  it("quarantines legacy messages and logs file identity for valid events", async () => {
    const legacyEvent = {
      id: fixtures.event.id,
      aggregateType: "memory_asset",
      aggregateId: fixtures.fileId,
      eventType: "ImageVariantsRequested",
      createdAt: fixtures.event.createdAt,
      payload: {
        memoryId: fixtures.event.payload.memoryId,
        spaceId: fixtures.event.payload.spaceId,
        assetId: fixtures.fileId,
        originalKey: `memories/${fixtures.event.payload.spaceId}/${fixtures.fileId}/original`,
        generationRecipeVersion: 1,
      },
    };
    const records = [
      { messageId: "invalid-json", body: "{" },
      { messageId: "legacy", body: JSON.stringify(legacyEvent) },
      { messageId: "valid", body: JSON.stringify(fixtures.event) },
    ];

    await expect(
      processImageBatch({ Records: records } as SQSEvent, fixtures.dependencies),
    ).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: "invalid-json" }, { itemIdentifier: "legacy" }],
    });
    expect(fixtures.dependencies.logger.error).toHaveBeenCalledWith({
      event: "image_processing_failed",
      messageId: "legacy",
      eventId: fixtures.event.id,
      fileId: undefined,
      code: "INVALID_EVENT",
    });
    expect(fixtures.dependencies.logger.info).toHaveBeenCalledWith({
      event: "image_processed",
      messageId: "valid",
      eventId: fixtures.event.id,
      fileId: fixtures.fileId,
      outcome: "completed",
    });
  });

  it.each([
    { messageId: "invalid-json", body: "{" },
    { messageId: "invalid-envelope", body: "null" },
    { messageId: "invalid-payload", body: JSON.stringify({ payload: [] }) },
  ])("rejects $messageId before database or storage access", async (record) => {
    await expect(
      processImageBatch({ Records: [record] } as SQSEvent, fixtures.dependencies),
    ).resolves.toEqual({ batchItemFailures: [{ itemIdentifier: record.messageId }] });
    expect(fixtures.prisma.file.findUnique).not.toHaveBeenCalled();
    expect(fixtures.prisma.file.updateMany).not.toHaveBeenCalled();
    expect(fixtures.storage.getObject).not.toHaveBeenCalled();
    expect(fixtures.storage.putObjectIfAbsent).not.toHaveBeenCalled();
  });

  it.each([
    { variantNames: [] },
    { variantNames: ["thumbnail"] },
    { variantNames: ["cover", "cover"] },
  ])(
    "rejects invalid variant set $variantNames before database or storage access",
    async ({ variantNames }) => {
      const event = {
        ...fixtures.event,
        payload: { ...fixtures.event.payload, variantNames },
      };
      const record = { messageId: "invalid-variants", body: JSON.stringify(event) };

      await expect(
        processImageBatch({ Records: [record] } as SQSEvent, fixtures.dependencies),
      ).resolves.toEqual({ batchItemFailures: [{ itemIdentifier: record.messageId }] });
      expect(fixtures.prisma.file.findUnique).not.toHaveBeenCalled();
      expect(fixtures.storage.getObject).not.toHaveBeenCalled();
      expect(fixtures.dependencies.logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INVALID_EVENT" }),
      );
    },
  );

  it("isolates transient record failures while processing later records", async () => {
    fixtures.storage.getObject.mockRejectedValueOnce(new Error("storage temporarily unavailable"));
    const records = ["transient", "successful"].map((messageId) => ({
      messageId,
      body: JSON.stringify(fixtures.event),
    }));

    await expect(
      processImageBatch({ Records: records } as SQSEvent, fixtures.dependencies),
    ).resolves.toEqual({ batchItemFailures: [{ itemIdentifier: "transient" }] });
    expect(
      [...fixtures.files.values()].filter(({ originalFileId }) => originalFileId !== null),
    ).toHaveLength(2);
    expect([...fixtures.files.values()].filter(({ status }) => status === "ready")).toHaveLength(3);
  });

  it("keeps unfinished variants recoverable before the retry budget is exhausted", async () => {
    fixtures.storage.getObject.mockRejectedValueOnce(new Error("storage unavailable"));
    const record = {
      messageId: "retryable",
      body: JSON.stringify(fixtures.event),
      attributes: { ApproximateReceiveCount: "1" },
    };

    await expect(
      processImageBatch({ Records: [record] } as SQSEvent, fixtures.dependencies),
    ).resolves.toEqual({ batchItemFailures: [{ itemIdentifier: "retryable" }] });

    const variants = [...fixtures.files.values()].filter(
      ({ originalFileId }) => originalFileId !== null,
    );
    expect(variants).toHaveLength(2);
    expect(variants.every(({ status }) => status === "pending")).toBe(true);
    expect(
      variants.every(({ lastErrorCode }) => lastErrorCode === "TRANSIENT_PROCESSING_ERROR"),
    ).toBe(true);
    expect(variants.some(({ status }) => status === "failed")).toBe(false);
  });

  it("marks only unfinished requested variants failed when the SQS retry budget is exhausted", async () => {
    const coverEvent = structuredClone(fixtures.event);
    coverEvent.payload.variantNames = ["cover"];
    await processImage({ value: coverEvent, dependencies: fixtures.dependencies });
    fixtures.storage.getObject.mockRejectedValueOnce(new Error("storage unavailable"));
    const record = {
      messageId: "exhausted",
      body: JSON.stringify(fixtures.event),
      attributes: { ApproximateReceiveCount: "5" },
    };

    await expect(
      processImageBatch({ Records: [record] } as SQSEvent, fixtures.dependencies),
    ).resolves.toEqual({ batchItemFailures: [{ itemIdentifier: "exhausted" }] });

    expect(
      [...fixtures.files.values()].find(({ variantName }) => variantName === "cover"),
    ).toMatchObject({
      status: "ready",
    });
    expect(
      [...fixtures.files.values()].find(({ variantName }) => variantName === "detail"),
    ).toMatchObject({
      status: "failed",
      lastErrorCode: "PROCESSING_RETRIES_EXHAUSTED",
    });
    expect(fixtures.files.get(fixtures.fileId)?.status).toBe("ready");
  });

  it("does not downgrade deleting variant rows on exhausted delivery", async () => {
    await processImage({ value: fixtures.event, dependencies: fixtures.dependencies });
    const cover = [...fixtures.files.values()].find(({ variantName }) => variantName === "cover");
    const detail = [...fixtures.files.values()].find(({ variantName }) => variantName === "detail");
    if (!cover || !detail) throw new Error("Missing variant file fixtures");
    cover.status = "deleting";
    detail.status = "pending";
    detail.sizeBytes = null;
    detail.lastErrorCode = null;
    fixtures.storage.getObject.mockRejectedValueOnce(new Error("storage unavailable"));
    const record = {
      messageId: "deleting-variant",
      body: JSON.stringify(fixtures.event),
      attributes: { ApproximateReceiveCount: "5" },
    };

    await expect(
      processImageBatch({ Records: [record] } as SQSEvent, fixtures.dependencies),
    ).resolves.toEqual({ batchItemFailures: [{ itemIdentifier: "deleting-variant" }] });

    expect(
      fixtures.prisma.file.updateMany.mock.calls.some(
        ([options]) => options.data.status === "failed",
      ),
    ).toBe(true);
    expect(
      [...fixtures.files.values()].find(({ variantName }) => variantName === "cover")?.status,
    ).toBe("deleting");
    expect(
      [...fixtures.files.values()].find(({ variantName }) => variantName === "detail"),
    ).toMatchObject({
      status: "failed",
      lastErrorCode: "PROCESSING_RETRIES_EXHAUSTED",
    });
  });
});
