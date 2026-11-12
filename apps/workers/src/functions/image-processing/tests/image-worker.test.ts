import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claimRootProcessingLease, releaseProcessingLease } from "../repositories/processing-lease";
import { generateVariant } from "../services/image-recipe";
import { processImage } from "../services/process-image";
import { createWorkerFixtures } from "./worker-fixtures";

describe("file-oriented queued image processing", () => {
  let fixtures: Awaited<ReturnType<typeof createWorkerFixtures>>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const bytes = await sharp({
      create: { width: 1800, height: 900, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    fixtures = await createWorkerFixtures(bytes);
  });

  afterEach(() => vi.useRealTimers());

  function getVariantFile(variantName: string) {
    const file = [...fixtures.files.values()].find(
      (candidate) =>
        candidate.originalFileId === fixtures.fileId && candidate.variantName === variantName,
    );
    if (!file) throw new Error(`Missing ${variantName} file fixture`);

    return file;
  }

  it("generates verified requested variants and acknowledges duplicate deliveries", async () => {
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("completed");

    for (const [variantName, width] of [
      ["cover", 1024],
      ["detail", 1600],
    ] as const) {
      const file = getVariantFile(variantName);
      expect(file).toMatchObject({
        status: "ready",
        mimeType: "image/webp",
        lastErrorCode: null,
        operationLockToken: null,
      });
      const bytes = fixtures.storageObjects.get(file.objectKey);
      expect(file.sizeBytes).toBe(BigInt(bytes?.length ?? 0));
      expect(await sharp(bytes).metadata()).toMatchObject({
        format: "webp",
        width,
        height: width / 2,
      });
    }

    const reads = fixtures.storage.getObject.mock.calls.length;
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("already_completed");
    expect(fixtures.storage.getObject).toHaveBeenCalledTimes(reads);
    expect(fixtures.files.get(fixtures.fileId)?.operationLockToken).toBeNull();
  });

  it("creates only the requested supported variant subset", async () => {
    const event = structuredClone(fixtures.event);
    event.payload.variantNames = ["cover"];

    await expect(processImage({ value: event, dependencies: fixtures.dependencies })).resolves.toBe(
      "completed",
    );

    expect(
      [...fixtures.files.values()].filter(({ originalFileId }) => originalFileId !== null),
    ).toHaveLength(1);
    expect(getVariantFile("cover").status).toBe("ready");
  });

  it("does not revive a family whose edit removal commits during processing", async () => {
    const putObjectIfAbsent = fixtures.storage.putObjectIfAbsent.getMockImplementation();
    if (!putObjectIfAbsent) throw new Error("Missing storage fixture");
    fixtures.storage.putObjectIfAbsent.mockImplementationOnce(async (parameters) => {
      // A committed edit removal retires the family while generation is in flight.
      getVariantFile("cover").status = "deleting";

      return putObjectIfAbsent(parameters);
    });

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("PROCESSING_OWNERSHIP_LOST");

    const cover = getVariantFile("cover");
    expect(cover.status).toBe("deleting");
    expect(cover.uploadedByUserId).toBe("user-a");
    expect(cover.objectKey).toBeTruthy();
    expect(fixtures.files.get(fixtures.fileId)?.status).toBe("ready");
  });

  it("acknowledges missing, detached, deleted-memory, and deleted-space contexts without storage access", async () => {
    fixtures.memory.deletedAt = new Date();
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("unavailable");
    fixtures.memory.deletedAt = null;

    fixtures.space.deletedAt = new Date();
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("unavailable");
    fixtures.space.deletedAt = null;

    const file = fixtures.files.get(fixtures.fileId);
    if (!file) throw new Error("Missing root file fixture");
    file.status = "deleting";
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("unavailable");
    expect([...fixtures.files.values()]).toHaveLength(1);
    file.status = "ready";

    fixtures.memoryFiles.splice(0);
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("unavailable");

    fixtures.setMissing();
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("unavailable");
    expect(fixtures.storage.getObject).not.toHaveBeenCalled();
  });

  it.each(["forged_memory", "wrong_original_key", "derivative_root"])(
    "rejects %s before storage access",
    async (kind) => {
      const event = structuredClone(fixtures.event);
      if (kind === "forged_memory") event.payload.memoryId = randomUUID();
      if (kind === "wrong_original_key") {
        const file = fixtures.files.get(fixtures.fileId);
        if (!file) throw new Error("Missing original file fixture");
        file.objectKey = "other/private/object";
      }
      if (kind === "derivative_root") {
        const file = fixtures.files.get(fixtures.fileId);
        if (!file) throw new Error("Missing original file fixture");
        file.originalFileId = randomUUID();
        file.variantName = "cover";
      }

      await expect(
        processImage({ value: event, dependencies: fixtures.dependencies }),
      ).rejects.toThrow();
      expect(fixtures.storage.getObject).not.toHaveBeenCalled();
    },
  );

  it("reclaims expired root locks but rejects active ownership", async () => {
    const file = fixtures.files.get(fixtures.fileId);
    if (!file) throw new Error("Missing root file fixture");
    file.operationLockToken = randomUUID();
    file.operationLockExpiresAt = new Date(Date.now() + 300_000);

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("PROCESSING_BUSY");
    vi.setSystemTime(new Date(Date.now() + 300_001));
    const prisma = fixtures.dependencies.prisma;
    const recoveredLease = await claimRootProcessingLease({ fileId: fixtures.fileId, prisma });
    await releaseProcessingLease({ lease: recoveredLease, prisma });

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("completed");
  });

  it("fences a stale worker after root ownership is replaced", async () => {
    const replacementToken = randomUUID();
    const put = fixtures.storage.putObjectIfAbsent.getMockImplementation();
    if (!put) throw new Error("Missing storage write fixture");
    fixtures.storage.putObjectIfAbsent.mockImplementationOnce(async (options) => {
      const outcome = await put(options);
      const rootFile = fixtures.files.get(fixtures.fileId);
      if (!rootFile) throw new Error("Missing root file fixture");
      rootFile.operationLockToken = replacementToken;
      rootFile.operationLockExpiresAt = new Date(Date.now() + 300_000);
      return outcome;
    });

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("PROCESSING_OWNERSHIP_LOST");
    expect(fixtures.files.get(fixtures.fileId)?.operationLockToken).toBe(replacementToken);
    expect(getVariantFile("cover")).toMatchObject({ status: "pending" });
  });

  it("fences a stale variant owner without clearing its replacement lock", async () => {
    const replacementToken = randomUUID();
    const getObject = fixtures.storage.getObject.getMockImplementation();
    if (!getObject) throw new Error("Missing object read fixture");
    fixtures.storage.getObject.mockImplementation(async (params) => {
      const result = await getObject(params);
      if (params.key.endsWith("cover.webp")) {
        const cover = getVariantFile("cover");
        cover.operationLockToken = replacementToken;
        cover.operationLockExpiresAt = new Date(Date.now() + 300_000);
      }
      return result;
    });

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("PROCESSING_OWNERSHIP_LOST");

    expect(getVariantFile("cover")).toMatchObject({
      status: "pending",
      operationLockToken: replacementToken,
    });
  });

  it("does not write a variant while another operation owns its file lock", async () => {
    await processImage({ value: fixtures.event, dependencies: fixtures.dependencies });
    const cover = getVariantFile("cover");
    cover.status = "pending";
    cover.operationLockToken = randomUUID();
    cover.operationLockExpiresAt = new Date(Date.now() + 300_000);
    fixtures.storageObjects.delete(cover.objectKey);
    fixtures.storage.putObjectIfAbsent.mockClear();

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("PROCESSING_BUSY");
    expect(fixtures.storage.putObjectIfAbsent).not.toHaveBeenCalled();
    expect(cover.operationLockToken).not.toBeNull();
  });

  it("resumes only unfinished requested variants after a transient write failure", async () => {
    const put = fixtures.storage.putObjectIfAbsent.getMockImplementation();
    if (!put) throw new Error("Missing storage write fixture");
    fixtures.storage.putObjectIfAbsent.mockImplementation(async (options) => {
      if (options.key.endsWith("detail.webp")) throw new Error("storage unavailable");
      return put(options);
    });

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("storage unavailable");
    expect(getVariantFile("cover").status).toBe("ready");
    expect(getVariantFile("detail")).toMatchObject({
      status: "pending",
      lastErrorCode: "TRANSIENT_PROCESSING_ERROR",
    });

    fixtures.storage.putObjectIfAbsent.mockImplementation(put);
    const priorWrites = fixtures.storage.putObjectIfAbsent.mock.calls.length;
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("completed");
    expect(
      fixtures.storage.putObjectIfAbsent.mock.calls
        .slice(priorWrites)
        .map(([options]) => options.key),
    ).toEqual([getVariantFile("detail").objectKey]);
  });

  it("verifies an existing output after a crash before ready bookkeeping", async () => {
    const update = fixtures.prisma.file.updateMany.getMockImplementation();
    if (!update) throw new Error("Missing file update fixture");
    let shouldInterrupt = true;
    fixtures.prisma.file.updateMany.mockImplementation(async (options) => {
      if (shouldInterrupt && options.data.status === "ready" && options.where.originalFileId) {
        shouldInterrupt = false;
        throw new Error("database unavailable");
      }
      return update(options);
    });

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("database unavailable");
    const cover = getVariantFile("cover");
    const accepted = fixtures.storageObjects.get(cover.objectKey);
    expect(accepted).toBeInstanceOf(Buffer);
    expect(cover.status).toBe("pending");

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("completed");
    expect(fixtures.storageObjects.get(cover.objectKey)).toEqual(accepted);
    expect(getVariantFile("cover").status).toBe("ready");
  });

  it("rejects corrupt originals before writing any variants", async () => {
    const invalidBytes = Buffer.from("invalid image");
    const rootFile = fixtures.files.get(fixtures.fileId);
    if (!rootFile) throw new Error("Missing root file fixture");
    rootFile.sizeBytes = BigInt(invalidBytes.length);
    fixtures.storageObjects.set(rootFile.objectKey, invalidBytes);
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("INVALID_ORIGINAL");
    expect(fixtures.storage.putObjectIfAbsent).not.toHaveBeenCalled();
    expect(
      [...fixtures.files.values()].filter(({ originalFileId }) => originalFileId !== null),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "failed", lastErrorCode: "INVALID_ORIGINAL" }),
        expect.objectContaining({ status: "failed", lastErrorCode: "INVALID_ORIGINAL" }),
      ]),
    );
  });

  it("never replaces an existing variant with conflicting bytes", async () => {
    const event = structuredClone(fixtures.event);
    event.payload.variantNames = ["cover"];
    const coverKey = `memories/${fixtures.event.payload.spaceId}/${fixtures.fileId}/cover.webp`;
    const conflict = Buffer.from("accepted incompatible bytes");
    fixtures.storageObjects.set(coverKey, conflict);

    await expect(
      processImage({ value: event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("VARIANT_CONTENT_CONFLICT");

    expect(fixtures.storageObjects.get(coverKey)).toEqual(conflict);
    expect(getVariantFile("cover")).toMatchObject({
      status: "failed",
      lastErrorCode: "VARIANT_CONTENT_CONFLICT",
    });
  });

  it("preserves orientation without enlarging small images", async () => {
    const bytes = await sharp({ create: { width: 80, height: 40, channels: 3, background: "red" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    for (const variantName of ["cover", "detail"] as const) {
      const output = await generateVariant(bytes, variantName);
      expect(await sharp(output).metadata()).toMatchObject({
        width: 40,
        height: 80,
        format: "webp",
      });
    }
  });
});
