import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCreationFixtures, creationRequest, SPACE_ID } from "../memories/creation-fixtures";

describe("first-write-wins original finalization", () => {
  let fixtures: ReturnType<typeof createCreationFixtures>;
  let bytes: Buffer;
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T00:00:00Z"));
    fixtures = createCreationFixtures();
    bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } })
      .png()
      .toBuffer();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retains an accepted final original after staging replacement, even with an expired signing URL", async () => {
    const upload = fixtures.addUpload(bytes, { uploadUrlExpiresAt: new Date(Date.now() - 1) });
    fixtures.storageObjects.set(upload.intendedFinalKey, bytes);
    fixtures.storageObjects.set(upload.stagingKey, Buffer.from("invalid replacement"));
    await fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) });
    expect(fixtures.storageObjects.get(upload.intendedFinalKey)).toEqual(bytes);
    expect(fixtures.storage.putObjectIfAbsent).not.toHaveBeenCalled();
    expect(fixtures.state.objects[0]).toMatchObject({ status: "ready", byteSize: bytes.length });
  });

  it("validates the actual destination when another writer wins during promotion", async () => {
    const upload = fixtures.addUpload(bytes);
    fixtures.storage.putObjectIfAbsent.mockImplementationOnce(async ({ key }) => {
      fixtures.storageObjects.set(key, Buffer.from("invalid first accepted final"));
      return "exists";
    });
    await expect(
      fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fixtures.state.uploads.get(upload.id)).toMatchObject({
      status: "failed",
      failureCode: "INVALID_IMAGE",
    });
    expect(fixtures.state.memories).toHaveLength(0);
    fixtures.storageObjects.set(upload.stagingKey, bytes);
    await expect(
      fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fixtures.storage.putObjectIfAbsent).toHaveBeenCalledOnce();
  });

  it("recovers a crash after copy without staging and without writing final again", async () => {
    const upload = fixtures.addUpload(bytes);
    const update = fixtures.prisma.fileUpload.updateMany.getMockImplementation();
    if (!update) throw new Error("Missing update fixture");
    let interrupted = false;
    fixtures.prisma.fileUpload.updateMany.mockImplementation(async (options) => {
      if (options.data.status === "finalized" && !interrupted) {
        interrupted = true;
        throw new Error("crash after copy");
      }
      return update(options);
    });
    await expect(
      fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) }),
    ).rejects.toThrow("crash after copy");
    expect(fixtures.storageObjects.get(upload.intendedFinalKey)).toEqual(bytes);
    fixtures.storageObjects.delete(upload.stagingKey);
    await fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) });
    expect(fixtures.storage.putObjectIfAbsent).toHaveBeenCalledOnce();
    expect(fixtures.state.uploads.get(upload.id)?.status).toBe("consumed");
  });

  it("reclaims expired claims and rejects active claims", async () => {
    const upload = fixtures.addUpload(bytes, {
      status: "finalizing",
      leaseToken: randomUUID(),
      leaseExpiresAt: new Date(Date.now() + 120_000),
    });
    await expect(
      fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) }),
    ).rejects.toMatchObject({ status: 409 });
    vi.setSystemTime(new Date(Date.now() + 120_001));
    await fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) });
    expect(fixtures.state.uploads.get(upload.id)?.status).toBe("consumed");
  });

  it("fences a stale finalizer after another request reclaims its lease", async () => {
    const upload = fixtures.addUpload(bytes);
    const replacementToken = randomUUID();
    fixtures.storage.putObjectIfAbsent.mockImplementationOnce(async ({ key, bytes }) => {
      fixtures.storageObjects.set(key, bytes);
      const current = fixtures.state.uploads.get(upload.id);
      if (!current) throw new Error("Missing upload fixture");
      current.leaseToken = replacementToken;
      current.leaseExpiresAt = new Date(Date.now() + 120_000);
      return "created";
    });
    await expect(
      fixtures.finalization.finalize({ id: upload.id, userId: "user-a", spaceId: SPACE_ID }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fixtures.state.uploads.get(upload.id)).toMatchObject({
      status: "finalizing",
      leaseToken: replacementToken,
      verifiedMimeType: null,
    });
  });

  it("releases earlier image claims if a later upload is unavailable", async () => {
    const upload = fixtures.addUpload(bytes);
    await expect(
      fixtures.memories.create({
        userId: "user-a",
        body: creationRequest([upload.id, randomUUID()]),
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fixtures.state.uploads.get(upload.id)).toMatchObject({
      status: "finalized",
      leaseToken: null,
    });
    await fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) });
    expect(fixtures.state.memories).toHaveLength(1);
  });
});
