import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCreationFixtures, creationRequest } from "./creation-fixtures";

describe("atomic memory creation and recovery", () => {
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

  it("commits normalized details, ordered assets, same-memory cover, original metadata and one event per image", async () => {
    const first = fixtures.addUpload(bytes);
    const second = fixtures.addUpload(bytes);
    const result = await fixtures.memories.create({
      userId: "user-a",
      body: {
        ...creationRequest([second.id, first.id]),
        title: "  A\r\nday  ",
        description: "  ",
        coverUploadId: first.id,
        visibility: "vault",
      },
    });
    expect(result.visibility).toBe("vault");
    expect(fixtures.state.memories[0]).toMatchObject({
      id: result.id,
      title: "A\nday",
      description: null,
      location: null,
      coverAssetId: first.id,
    });
    expect(
      fixtures.state.assets.map(({ id, position, memoryId }) => ({ id, position, memoryId })),
    ).toEqual([
      { id: second.id, position: 0, memoryId: result.id },
      { id: first.id, position: 1, memoryId: result.id },
    ]);
    expect(fixtures.state.objects).toHaveLength(6);
    expect(fixtures.state.objects.filter(({ status }) => status === "ready")).toEqual([
      expect.objectContaining({
        assetId: second.id,
        variantType: "original",
        mimeType: "image/png",
        byteSize: bytes.length,
      }),
      expect.objectContaining({
        assetId: first.id,
        variantType: "original",
        mimeType: "image/png",
        byteSize: bytes.length,
      }),
    ]);
    expect(fixtures.state.objects.filter(({ status }) => status === "pending")).toHaveLength(4);
    expect(fixtures.state.events).toHaveLength(2);
    expect(fixtures.state.events[0]).toMatchObject({
      aggregateId: second.id,
      eventType: "ImageVariantsRequested",
      schemaVersion: 1,
      payload: {
        memoryId: result.id,
        originalKey: second.intendedFinalKey,
        generationRecipeVersion: 1,
      },
    });
    expect(
      [...fixtures.state.uploads.values()].every(
        ({ status, consumedAt }) => status === "consumed" && consumedAt !== null,
      ),
    ).toBe(true);
  });

  it("resolves a lost-response retry before rejecting consumed uploads and does no more storage work", async () => {
    const upload = fixtures.addUpload(bytes);
    const request = creationRequest([upload.id]);
    const first = await fixtures.memories.create({ userId: "user-a", body: request });
    const reads = fixtures.storage.getObject.mock.calls.length;
    await expect(
      fixtures.memories.create({
        userId: "user-a",
        body: { ...request, description: null, location: " " },
      }),
    ).resolves.toEqual(first);
    expect(fixtures.state.memories).toHaveLength(1);
    expect(fixtures.state.events).toHaveLength(1);
    expect(fixtures.storage.getObject.mock.calls).toHaveLength(reads);
    fixtures.state.activeMembership = false;
    await expect(
      fixtures.memories.create({ userId: "user-a", body: request }),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it("rejects changed input, order, or cover under an already committed key", async () => {
    const first = fixtures.addUpload(bytes);
    const second = fixtures.addUpload(bytes);
    const request = creationRequest([first.id, second.id]);
    await fixtures.memories.create({ userId: "user-a", body: request });
    for (const change of [
      { title: "Changed" },
      { uploadIds: [second.id, first.id] },
      { coverUploadId: first.id },
    ]) {
      await expect(
        fixtures.memories.create({ userId: "user-a", body: { ...request, ...change } }),
      ).rejects.toMatchObject({ status: 409 });
    }
    expect(fixtures.state.memories).toHaveLength(1);
  });

  it("commits concurrent photo-free retries once and finds the winner after rollback", async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        fixtures.memories.create({ userId: "user-a", body: creationRequest() }),
      ),
    );
    expect(new Set(results.map(({ id }) => id)).size).toBe(1);
    expect(fixtures.state.memories).toHaveLength(1);
    expect(fixtures.state.rollbacks).toBeGreaterThan(0);
    expect(fixtures.state.assets).toHaveLength(0);
    expect(fixtures.state.events).toHaveLength(0);
    expect(fixtures.storage.getObject).not.toHaveBeenCalled();
  });

  it("permits at most one concurrent image attachment and returns a retryable outcome to contenders", async () => {
    const upload = fixtures.addUpload(bytes);
    const results = await Promise.allSettled([
      fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) }),
      fixtures.memories.create({
        userId: "user-a",
        body: {
          ...creationRequest([upload.id]),
          idempotencyKey: randomUUID(),
        },
      }),
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const loser = results.find(({ status }) => status === "rejected");
    expect(loser).toMatchObject({ reason: { status: 409 } });
    expect(fixtures.state.assets).toHaveLength(1);
  });

  it.each(["foreign-user", "foreign-space", "expired", "consumed", "failed", "missing"])(
    "rejects %s uploads without exposing metadata",
    async (scenario) => {
      const upload = fixtures.addUpload(bytes);
      if (scenario === "foreign-user") upload.uploaderUserId = "user-b";
      if (scenario === "foreign-space") upload.spaceId = randomUUID();
      if (scenario === "expired") upload.attachmentDeadline = new Date(Date.now() - 1);
      if (scenario === "consumed") upload.status = "consumed";
      if (scenario === "failed") upload.status = "failed";
      if (scenario === "missing") fixtures.state.uploads.delete(upload.id);
      await expect(
        fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) }),
      ).rejects.toMatchObject({ status: 404 });
      expect(fixtures.state.memories).toHaveLength(0);
      expect(fixtures.storage.getObject).not.toHaveBeenCalled();
    },
  );

  it("rolls back memory, cover, assets, objects, consumption and events if an outbox insertion fails", async () => {
    const first = fixtures.addUpload(bytes);
    const second = fixtures.addUpload(bytes);
    fixtures.prisma.outboxEvent.create.mockImplementationOnce(async ({ data }) => {
      fixtures.state.events.push(data);
      return data;
    });
    fixtures.prisma.outboxEvent.create.mockRejectedValueOnce(new Error("outbox unavailable"));
    const request = { ...creationRequest([first.id, second.id]), coverUploadId: first.id };
    await expect(fixtures.memories.create({ userId: "user-a", body: request })).rejects.toThrow(
      "outbox unavailable",
    );
    expect(fixtures.state.memories).toHaveLength(0);
    expect(fixtures.state.assets).toHaveLength(0);
    expect(fixtures.state.objects).toHaveLength(0);
    expect(fixtures.state.events).toHaveLength(0);
    expect(
      [...fixtures.state.uploads.values()].every(
        ({ status, leaseToken }) => status === "finalized" && leaseToken === null,
      ),
    ).toBe(true);
    expect(fixtures.storageObjects.has(first.intendedFinalKey)).toBe(true);
    await fixtures.memories.create({ userId: "user-a", body: request });
    expect(fixtures.state.memories).toHaveLength(1);
    expect(fixtures.state.events).toHaveLength(2);
  });

  it("preserves the creation failure and releases claims when the recovery lookup fails", async () => {
    const upload = fixtures.addUpload(bytes);
    const creationError = new Error("outbox unavailable");
    fixtures.prisma.outboxEvent.create.mockRejectedValueOnce(creationError);
    fixtures.prisma.memory.findUnique
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("recovery lookup unavailable"));

    await expect(
      fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) }),
    ).rejects.toBe(creationError);

    expect(fixtures.state.memories).toHaveLength(0);
    expect(fixtures.state.uploads.get(upload.id)).toMatchObject({
      status: "finalized",
      leaseToken: null,
      leaseExpiresAt: null,
    });
  });

  it("preserves the idempotency conflict when recovery finds a different committed input", async () => {
    await fixtures.memories.create({ userId: "user-a", body: creationRequest() });
    fixtures.prisma.memory.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fixtures.state.memories[0]);

    await expect(
      fixtures.memories.create({
        userId: "user-a",
        body: { ...creationRequest(), title: "Changed" },
      }),
    ).rejects.toMatchObject({
      status: 409,
      response: {
        errors: [expect.objectContaining({ code: "IDEMPOTENCY_CONFLICT" })],
      },
    });
  });

  it("rechecks active membership inside the consuming transaction", async () => {
    const upload = fixtures.addUpload(bytes);
    fixtures.prisma.$queryRaw.mockResolvedValueOnce([]);
    await expect(
      fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fixtures.state.memories).toHaveLength(0);
    expect(fixtures.state.uploads.get(upload.id)?.status).toBe("finalized");
  });

  it("rolls back when a finalized lease is superseded before consumption", async () => {
    const upload = fixtures.addUpload(bytes);
    fixtures.prisma.$queryRaw.mockImplementationOnce(async () => {
      const current = fixtures.state.uploads.get(upload.id);
      if (current) current.leaseToken = randomUUID();
      return [{ id: "member" }];
    });
    await expect(
      fixtures.memories.create({ userId: "user-a", body: creationRequest([upload.id]) }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fixtures.state.memories).toHaveLength(0);
    expect(fixtures.state.events).toHaveLength(0);
    expect(fixtures.state.uploads.get(upload.id)?.status).toBe("finalized");
  });
});
