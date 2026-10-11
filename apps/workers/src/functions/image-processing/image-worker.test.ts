import { randomUUID } from "node:crypto";
import type { SQSEvent } from "aws-lambda";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateVariant } from "../../services/image/image-recipe";
import { processImage } from "./process-image";
import { processImageBatch } from "./sqs-handler";
import { createWorkerFixtures } from "./worker-fixtures";

describe("independent queued image processing", () => {
  let fixtures: Awaited<ReturnType<typeof createWorkerFixtures>>;
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T00:00:00Z"));
    const bytes = await sharp({
      create: { width: 1800, height: 900, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    fixtures = await createWorkerFixtures(bytes);
  });
  afterEach(() => vi.useRealTimers());
  it("generates verified recipe outputs and acknowledges duplicates without storage work", async () => {
    await expect(processImage(fixtures.event, fixtures.dependencies)).resolves.toBe("completed");
    for (const [variant, width] of [
      ["cover", 1024],
      ["detail", 1600],
    ] as const) {
      const object = fixtures.objects.find((object) => object.variantType === variant);
      expect(object).toMatchObject({
        status: "ready",
        mimeType: "image/webp",
        failureCode: null,
        readyAt: expect.any(Date),
      });
      const bytes = fixtures.storageObjects.get(object?.objectPath as string);
      expect(object?.byteSize).toBe(bytes?.length);
      const metadata = await sharp(bytes).metadata();
      expect(metadata).toMatchObject({ format: "webp", width, height: width / 2 });
    }
    const reads = fixtures.storage.getObject.mock.calls.length;
    await expect(processImage(fixtures.event, fixtures.dependencies)).resolves.toBe(
      "already_completed",
    );
    expect(fixtures.storage.getObject.mock.calls).toHaveLength(reads);
    expect(fixtures.asset.processingLeaseToken).toBeNull();
  });
  it("safely acknowledges missing, deleted memories and deleted spaces", async () => {
    fixtures.memory.deletedAt = new Date();
    await expect(processImage(fixtures.event, fixtures.dependencies)).resolves.toBe("unavailable");
    fixtures.memory.deletedAt = null;
    fixtures.memory.space.deletedAt = new Date();
    await expect(processImage(fixtures.event, fixtures.dependencies)).resolves.toBe("unavailable");
    fixtures.setMissing();
    await expect(processImage(fixtures.event, fixtures.dependencies)).resolves.toBe("unavailable");
    expect(fixtures.storage.getObject).not.toHaveBeenCalled();
  });
  it.each([
    "invalid_key",
    "unsupported_schema",
    "unsupported_recipe",
    "foreign_memory",
    "metadata_mismatch",
    "invalid_ready_variant",
  ])("rejects %s before storage access", async (kind) => {
    const event = structuredClone(fixtures.event);
    if (kind === "invalid_key") event.payload.originalKey = "other/private/object";
    if (kind === "unsupported_schema") Object.assign(event, { schemaVersion: 2 });
    if (kind === "unsupported_recipe") event.payload.generationRecipeVersion = 2;
    if (kind === "foreign_memory") event.payload.memoryId = randomUUID();
    if (kind === "metadata_mismatch") fixtures.objects[0].byteSize = 1;
    if (kind === "invalid_ready_variant")
      Object.assign(fixtures.objects[1], {
        status: "ready",
        mimeType: "image/png",
        byteSize: 1,
        readyAt: new Date(),
      });
    await expect(processImage(event, fixtures.dependencies)).rejects.toThrow();
    expect(fixtures.storage.getObject).not.toHaveBeenCalled();
  });
  it("recovers expired leases but rejects overlapping active ownership", async () => {
    fixtures.asset.processingLeaseToken = randomUUID();
    fixtures.asset.processingLeaseExpiresAt = new Date(Date.now() + 300_000);
    await expect(processImage(fixtures.event, fixtures.dependencies)).rejects.toThrow(
      "PROCESSING_BUSY",
    );
    vi.setSystemTime(new Date(Date.now() + 300_001));
    await expect(processImage(fixtures.event, fixtures.dependencies)).resolves.toBe("completed");
  });
  it("fences a stale worker from committing metadata or clearing a replacement lease", async () => {
    const replacement = randomUUID();
    const put = fixtures.storage.putObjectIfAbsent.getMockImplementation();
    fixtures.storage.putObjectIfAbsent.mockImplementationOnce(async (options) => {
      const outcome = await put?.(options);
      fixtures.asset.processingLeaseToken = replacement;
      return outcome ?? "created";
    });
    await expect(processImage(fixtures.event, fixtures.dependencies)).rejects.toThrow(
      "PROCESSING_OWNERSHIP_LOST",
    );
    expect(fixtures.asset.processingLeaseToken).toBe(replacement);
    expect(fixtures.objects.filter((object) => object.status === "ready")).toHaveLength(1);
    expect(fixtures.dependencies.logger.error).toHaveBeenCalledWith({
      event: "image_failure_bookkeeping_failed",
      eventId: fixtures.event.id,
      assetId: fixtures.event.payload.assetId,
      code: "PROCESSING_OWNERSHIP_LOST",
    });
  });
  it("resumes incomplete output after transient failure without overwriting the ready variant", async () => {
    const put = fixtures.storage.putObjectIfAbsent.getMockImplementation();
    fixtures.storage.putObjectIfAbsent.mockImplementation(async (options) => {
      if (options.key.endsWith("detail.webp")) throw new Error("storage unavailable");
      return (await put?.(options)) ?? "created";
    });
    await expect(processImage(fixtures.event, fixtures.dependencies)).rejects.toThrow(
      "storage unavailable",
    );
    expect(fixtures.objects.find((object) => object.variantType === "cover")?.status).toBe("ready");
    expect(fixtures.objects.find((object) => object.variantType === "detail")).toMatchObject({
      status: "pending",
      failureCode: "TRANSIENT_PROCESSING_ERROR",
    });
    fixtures.storage.putObjectIfAbsent.mockImplementation(put as NonNullable<typeof put>);
    const writes = fixtures.storage.putObjectIfAbsent.mock.calls.length;
    await expect(processImage(fixtures.event, fixtures.dependencies)).resolves.toBe("completed");
    expect(
      fixtures.storage.putObjectIfAbsent.mock.calls.slice(writes).map(([options]) => options.key),
    ).toEqual([fixtures.event.payload.originalKey.replace("original", "detail.webp")]);
  });
  it("reuses outputs uploaded before interrupted metadata writes", async () => {
    const update = fixtures.prisma.memoryAssetObject.updateMany.getMockImplementation();
    let shouldFail = true;
    fixtures.prisma.memoryAssetObject.updateMany.mockImplementation(async (options) => {
      if (shouldFail && options.data.status === "ready") {
        shouldFail = false;
        throw new Error("database unavailable");
      }
      return (await update?.(options)) ?? { count: 0 };
    });
    await expect(processImage(fixtures.event, fixtures.dependencies)).rejects.toThrow();
    const key = fixtures.event.payload.originalKey.replace("original", "cover.webp");
    const accepted = fixtures.storageObjects.get(key);
    expect(accepted).toBeInstanceOf(Buffer);
    expect(fixtures.objects.filter((object) => object.status === "ready")).toHaveLength(1);
    await expect(processImage(fixtures.event, fixtures.dependencies)).resolves.toBe("completed");
    expect(fixtures.storageObjects.get(key)).toEqual(accepted);
    expect(fixtures.objects.filter((object) => object.status === "ready")).toHaveLength(3);
  });
  it("records corrupt originals as permanent failed variants", async () => {
    const bytes = Buffer.from("invalid image");
    fixtures.storageObjects.set(fixtures.event.payload.originalKey, bytes);
    fixtures.objects[0].byteSize = bytes.length;
    const find = fixtures.prisma.memoryAsset.findUnique.getMockImplementation();
    fixtures.prisma.memoryAsset.findUnique.mockImplementation(async () => {
      const asset = await find?.();
      if (asset?.upload) asset.upload.verifiedByteSize = bytes.length;
      return asset ?? null;
    });
    await expect(processImage(fixtures.event, fixtures.dependencies)).rejects.toThrow(
      "INVALID_ORIGINAL",
    );
    expect(
      fixtures.objects
        .filter((object) => object.variantType !== "original")
        .every((object) => object.status === "failed" && object.failureCode === "INVALID_ORIGINAL"),
    ).toBe(true);
  });
  it("never replaces a conflicting accepted output", async () => {
    const key = fixtures.event.payload.originalKey.replace("original", "cover.webp");
    const conflicting = Buffer.from("accepted incompatible bytes");
    fixtures.storageObjects.set(key, conflicting);
    await expect(processImage(fixtures.event, fixtures.dependencies)).rejects.toThrow(
      "VARIANT_CONTENT_CONFLICT",
    );
    expect(fixtures.storageObjects.get(key)).toEqual(conflicting);
  });
  it("returns only failed record IDs for malformed and mixed SQS batches", async () => {
    const records = [
      { messageId: "invalid-json", body: "{" },
      { messageId: "unsupported", body: JSON.stringify({ ...fixtures.event, schemaVersion: 99 }) },
      { messageId: "valid", body: JSON.stringify(fixtures.event) },
    ];
    await expect(
      processImageBatch({ Records: records } as SQSEvent, fixtures.dependencies),
    ).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: "invalid-json" }, { itemIdentifier: "unsupported" }],
    });
    expect(fixtures.dependencies.logger.error).toHaveBeenCalledWith({
      event: "image_processing_failed",
      messageId: "invalid-json",
      code: "INVALID_JSON",
    });
    expect(fixtures.dependencies.logger.info).toHaveBeenCalledWith({
      event: "image_processed",
      messageId: "valid",
      eventId: fixtures.event.id,
      assetId: fixtures.event.payload.assetId,
      outcome: "completed",
    });
  });
  it("preserves orientation without enlarging small images", async () => {
    const bytes = await sharp({ create: { width: 80, height: 40, channels: 3, background: "red" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    for (const variant of ["cover", "detail"] as const) {
      const output = await generateVariant(bytes, variant);
      expect(await sharp(output).metadata()).toMatchObject({
        width: 40,
        height: 80,
        format: "webp",
      });
    }
  });
  it("isolates transient record failures while acknowledging a succeeding retry in the same batch", async () => {
    fixtures.storage.getObject.mockRejectedValueOnce(new Error("storage temporarily unavailable"));
    const records = ["transient", "successful"].map((messageId) => ({
      messageId,
      body: JSON.stringify(fixtures.event),
    }));
    await expect(
      processImageBatch({ Records: records } as SQSEvent, fixtures.dependencies),
    ).resolves.toEqual({ batchItemFailures: [{ itemIdentifier: "transient" }] });
    expect(fixtures.objects.filter((object) => object.status === "ready")).toHaveLength(3);
  });
});
