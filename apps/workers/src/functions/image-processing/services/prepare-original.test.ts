import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createWorkerFixtures } from "../tests/worker-fixtures";
import { processImage } from "./process-image";

async function createUpload() {
  const bytes = await sharp({ create: { width: 80, height: 40, channels: 3, background: "red" } })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const fixtures = createWorkerFixtures(bytes);
  fixtures.file.status = "uploaded";
  fixtures.file.mimeType = "image/jpeg";
  return { fixtures, bytes };
}

describe("original WebP replacement", () => {
  it.each(["mime", "size"])("rejects a spoofed %s descriptor in the worker", async (kind) => {
    const { fixtures } = await createUpload();
    if (kind === "mime") fixtures.file.mimeType = "image/png";
    if (kind === "size") fixtures.file.sizeBytes = (fixtures.file.sizeBytes ?? 0n) + 1n;
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow();
    expect(fixtures.files.get(fixtures.fileId)?.status).toBe("failed");
    expect(fixtures.storage.putObjectIfAbsent).not.toHaveBeenCalled();
  });

  it("retains source bytes for retry when derivative generation fails after the swap", async () => {
    const { fixtures, bytes } = await createUpload();
    const sourceKey = fixtures.file.objectKey;
    const put = fixtures.storage.putObjectIfAbsent.getMockImplementation();
    if (!put) throw new Error("Missing storage fixture");
    fixtures.storage.putObjectIfAbsent.mockImplementation(async (options) => {
      if (options.key.endsWith("detail.webp")) throw new Error("storage unavailable");
      return put(options);
    });
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("storage unavailable");
    expect(fixtures.files.get(fixtures.fileId)).toMatchObject({
      status: "ready",
      objectKey: `${sourceKey}.webp`,
    });
    fixtures.storage.putObjectIfAbsent.mockImplementation(put);
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("completed");
    const expected = await sharp(bytes)
      .autoOrient()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    expect(fixtures.storageObjects.get(sourceKey.replace("/original", "/detail.webp"))).toEqual(
      expected,
    );
  });

  it("rejects a stale original swap without deleting or replacing the source", async () => {
    const { fixtures } = await createUpload();
    const sourceKey = fixtures.file.objectKey;
    const put = fixtures.storage.putObjectIfAbsent.getMockImplementation();
    if (!put) throw new Error("Missing storage fixture");
    fixtures.storage.putObjectIfAbsent.mockImplementationOnce(async (options) => {
      const outcome = await put(options);
      fixtures.file.operationLockToken = "replacement-owner";
      return outcome;
    });
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("PROCESSING_OWNERSHIP_LOST");
    expect(fixtures.files.get(fixtures.fileId)).toMatchObject({
      status: "uploaded",
      objectKey: sourceKey,
      operationLockToken: "replacement-owner",
    });
    expect(
      [...fixtures.files.values()].some(({ variantName }) => variantName === "upload_source"),
    ).toBe(false);
    expect(fixtures.storageObjects.has(sourceKey)).toBe(true);
  });
  it("validates and swaps the same original to full-resolution quality-90 WebP with durable source cleanup", async () => {
    const { fixtures, bytes } = await createUpload();
    const sourceKey = fixtures.file.objectKey;
    await processImage({ value: fixtures.event, dependencies: fixtures.dependencies });
    const root = fixtures.files.get(fixtures.fileId);
    const expected = await sharp(bytes).autoOrient().webp({ quality: 90 }).toBuffer();

    expect(root).toMatchObject({
      id: fixtures.fileId,
      objectKey: `${sourceKey}.webp`,
      mimeType: "image/webp",
      sizeBytes: BigInt(expected.length),
      status: "ready",
    });
    expect(fixtures.storageObjects.get(`${sourceKey}.webp`)).toEqual(expected);
    expect(await sharp(expected).metadata()).toMatchObject({ width: 40, height: 80 });
    expect([...fixtures.files.values()]).toContainEqual(
      expect.objectContaining({
        variantName: "upload_source",
        objectKey: sourceKey,
        status: "deleting",
        mimeType: "image/jpeg",
        sizeBytes: BigInt(bytes.length),
      }),
    );
    expect(fixtures.storageObjects.get(sourceKey)).toEqual(bytes);
    expect(
      fixtures.storage.getObject.mock.calls.filter(([{ key }]) => key === sourceKey),
    ).toHaveLength(1);
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("already_completed");
  });

  it("resumes after writing the WebP but before committing the swap", async () => {
    const { fixtures } = await createUpload();
    const sourceKey = fixtures.file.objectKey;
    const update = fixtures.prisma.file.updateMany.getMockImplementation();
    if (!update) throw new Error("Missing update fixture");
    let shouldInterrupt = true;
    fixtures.prisma.file.updateMany.mockImplementation(async (options) => {
      if (shouldInterrupt && options.data.objectKey === `${sourceKey}.webp`) {
        shouldInterrupt = false;
        throw new Error("database unavailable");
      }
      return update(options);
    });
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("database unavailable");
    expect(fixtures.files.get(fixtures.fileId)).toMatchObject({
      objectKey: sourceKey,
      status: "uploaded",
    });
    const accepted = fixtures.storageObjects.get(`${sourceKey}.webp`);
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).resolves.toBe("completed");
    expect(fixtures.storageObjects.get(`${sourceKey}.webp`)).toEqual(accepted);
  });

  it("marks invalid uploaded originals failed without writing outputs", async () => {
    const { fixtures } = await createUpload();
    const bytes = Buffer.from("invalid image");
    fixtures.file.sizeBytes = BigInt(bytes.length);
    fixtures.storageObjects.set(fixtures.file.objectKey, bytes);
    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("INVALID_ORIGINAL");
    expect(fixtures.files.get(fixtures.fileId)).toMatchObject({
      status: "failed",
      lastErrorCode: "INVALID_ORIGINAL",
      operationLockToken: null,
    });
    const variants = [...fixtures.files.values()].filter(
      ({ originalFileId }) => originalFileId === fixtures.fileId,
    );
    expect(variants).toHaveLength(2);
    expect(
      variants.every(
        ({ status, lastErrorCode }) => status === "failed" && lastErrorCode === "INVALID_ORIGINAL",
      ),
    ).toBe(true);
    expect(fixtures.storage.putObjectIfAbsent).not.toHaveBeenCalled();
  });
});
