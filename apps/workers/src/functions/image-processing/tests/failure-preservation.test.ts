import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processImage } from "../services/process-image";
import { createWorkerFixtures } from "./worker-fixtures";

describe("image processing failure preservation", () => {
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

  it("preserves the processing error when root lease release also fails", async () => {
    const update = fixtures.prisma.file.updateMany.getMockImplementation();
    if (!update) throw new Error("Missing file update fixture");
    fixtures.prisma.file.updateMany.mockImplementation(async (options) => {
      if (options.data.operationLockToken === null) throw new Error("release unavailable");
      return update(options);
    });
    fixtures.storage.getObject.mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("storage unavailable");

    expect(fixtures.dependencies.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "image_failure_release_failed",
        fileId: fixtures.fileId,
        err: expect.any(Error),
      }),
    );
  });

  it("reports a release failure when processing itself succeeded", async () => {
    const update = fixtures.prisma.file.updateMany.getMockImplementation();
    if (!update) throw new Error("Missing file update fixture");
    fixtures.prisma.file.updateMany.mockImplementation(async (options) => {
      const isRootRelease =
        options.where.id === fixtures.fileId && options.data.operationLockToken === null;
      if (isRootRelease) throw new Error("release unavailable");
      return update(options);
    });

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("release unavailable");
    expect(fixtures.dependencies.logger.error).not.toHaveBeenCalled();
  });

  it("reports root bookkeeping failure without replacing the processing error", async () => {
    const update = fixtures.prisma.file.updateMany.getMockImplementation();
    if (!update) throw new Error("Missing file update fixture");
    fixtures.prisma.file.updateMany.mockImplementation(async (options) => {
      const isRootBookkeeping =
        options.where.id === fixtures.fileId && typeof options.data.lastErrorCode === "string";
      if (isRootBookkeeping) throw new Error("bookkeeping unavailable");
      return update(options);
    });
    fixtures.storage.getObject.mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(
      processImage({ value: fixtures.event, dependencies: fixtures.dependencies }),
    ).rejects.toThrow("storage unavailable");

    expect(fixtures.dependencies.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "image_failure_bookkeeping_failed",
        fileId: fixtures.fileId,
        err: expect.any(Error),
      }),
    );
  });
});
