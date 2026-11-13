import { randomUUID } from "node:crypto";
import { Logger, NotFoundException } from "@nestjs/common";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCreationFixtures,
  createMemoryRequest,
  SPACE_ID,
} from "../../../app/tests/creation-fixtures";

describe("atomic memory creation and recovery", () => {
  let fixtures: Awaited<ReturnType<typeof createCreationFixtures>>;
  let bytes: Buffer;
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T00:00:00Z"));
    fixtures = await createCreationFixtures();
    bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } })
      .png()
      .toBuffer();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("commits normalized details, ordered file associations, same-memory cover and one event per image", async () => {
    const first = fixtures.addUpload({ bytes });
    const second = fixtures.addUpload({ bytes });
    const result = await fixtures.memories.create({
      userId: "user-a",
      body: {
        ...createMemoryRequest([second.id, first.id]),
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
      coverFileId: first.id,
    });
    expect(
      fixtures.state.memoryFiles.map(({ fileId, position, memoryId }) => ({
        fileId,
        position,
        memoryId,
      })),
    ).toEqual([
      { fileId: second.id, position: 0, memoryId: result.id },
      { fileId: first.id, position: 1, memoryId: result.id },
    ]);
    expect(
      [...fixtures.state.uploads.values()].map(({ id, status, operationLockToken }) => ({
        id,
        status,
        operationLockToken,
      })),
    ).toEqual([
      { id: first.id, status: "uploaded", operationLockToken: null },
      { id: second.id, status: "uploaded", operationLockToken: null },
    ]);
    expect(fixtures.state.events).toHaveLength(2);
    expect(fixtures.state.events[0]).toMatchObject({
      entityType: "file",
      entityId: second.id,
      eventType: "ImageVariantsRequested",
      payload: {
        memoryId: result.id,
        spaceId: SPACE_ID,
        variantNames: ["cover", "detail"],
      },
    });
  });

  it("confirms uploads concurrently and releases successful claims when another confirmation fails", async () => {
    const first = fixtures.addUpload({ bytes });
    const second = fixtures.addUpload({ bytes });
    const confirmationIds: string[] = [];
    let releaseFirstConfirmation!: () => void;
    let markFirstConfirmationStarted!: () => void;
    const firstConfirmationGate = new Promise<void>((resolve) => {
      releaseFirstConfirmation = resolve;
    });
    const firstConfirmationStarted = new Promise<void>((resolve) => {
      markFirstConfirmationStarted = resolve;
    });
    const confirmUploaded = fixtures.finalization.confirmUploaded.bind(fixtures.finalization);
    vi.spyOn(fixtures.finalization, "confirmUploaded").mockImplementation(async (params) => {
      confirmationIds.push(params.id);
      if (params.id === first.id) {
        markFirstConfirmationStarted();
        await firstConfirmationGate;
        return confirmUploaded(params);
      }
      if (params.id === second.id) throw new Error("Upload confirmation failed");

      throw new Error("Unexpected upload confirmation");
    });

    const creation = fixtures.memories.create({
      userId: "user-a",
      body: createMemoryRequest([first.id, second.id]),
    });
    await firstConfirmationStarted;
    const wasConcurrent = confirmationIds.length === 2;
    releaseFirstConfirmation();

    await expect(creation).rejects.toThrow("Upload confirmation failed");
    expect(wasConcurrent).toBe(true);
    expect(fixtures.state.uploads.get(first.id)).toMatchObject({
      status: "uploaded",
      operationLockToken: null,
      operationLockExpiresAt: null,
    });
  });

  it("records unexpected upload failures that do not propagate", async () => {
    const first = fixtures.addUpload({ bytes });
    const second = fixtures.addUpload({ bytes });
    const droppedError = new Error("storage unavailable");
    vi.spyOn(fixtures.finalization, "confirmUploaded").mockImplementation(async ({ id }) => {
      if (id === first.id) throw new NotFoundException({ error: "The upload is unavailable." });

      throw droppedError;
    });
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

    await expect(
      fixtures.memories.create({
        userId: "user-a",
        body: createMemoryRequest([first.id, second.id]),
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(warn).toHaveBeenCalledWith({
      event: "upload_confirmation_failed",
      uploadId: second.id,
      outcome: "failed",
      err: droppedError,
    });
    expect(
      warn.mock.calls.filter(([record]) => record.event === "upload_confirmation_failed"),
    ).toHaveLength(1);
  });

  it("records the consumed failure when recovery finds a committed creation", async () => {
    const upload = fixtures.addUpload({ bytes });
    const request = createMemoryRequest([upload.id]);
    const committed = await fixtures.memories.create({ userId: "user-a", body: request });
    const consumedError = new Error("database unavailable");
    fixtures.prisma.memory.findUnique.mockResolvedValueOnce(null);
    fixtures.prisma.$queryRaw.mockRejectedValueOnce(consumedError);
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

    await expect(fixtures.memories.create({ userId: "user-a", body: request })).resolves.toEqual(
      committed,
    );
    expect(warn).toHaveBeenCalledWith({
      event: "memory_creation_recovered",
      memoryId: committed.id,
      outcome: "recovered",
      err: consumedError,
    });
  });

  it("resolves a lost-response retry before re-verifying ready files", async () => {
    const upload = fixtures.addUpload({ bytes });
    const request = createMemoryRequest([upload.id]);
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
    fixtures.state.hasActiveMembership = false;
    await expect(
      fixtures.memories.create({ userId: "user-a", body: request }),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it("rejects changed input, order, or cover under an already committed key", async () => {
    const first = fixtures.addUpload({ bytes });
    const second = fixtures.addUpload({ bytes });
    const request = createMemoryRequest([first.id, second.id]);
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
        fixtures.memories.create({ userId: "user-a", body: createMemoryRequest() }),
      ),
    );
    expect(new Set(results.map(({ id }) => id)).size).toBe(1);
    expect(fixtures.state.memories).toHaveLength(1);
    expect(fixtures.state.rollbacks).toBeGreaterThan(0);
    expect(fixtures.state.memoryFiles).toHaveLength(0);
    expect(fixtures.state.events).toHaveLength(0);
    expect(fixtures.storage.getObject).not.toHaveBeenCalled();
  });

  it("permits at most one concurrent image attachment and returns a retryable outcome to contenders", async () => {
    const upload = fixtures.addUpload({ bytes });
    const results = await Promise.allSettled([
      fixtures.memories.create({ userId: "user-a", body: createMemoryRequest([upload.id]) }),
      fixtures.memories.create({
        userId: "user-a",
        body: {
          ...createMemoryRequest([upload.id]),
          idempotencyKey: randomUUID(),
        },
      }),
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const loser = results.find(({ status }) => status === "rejected");
    expect(loser).toMatchObject({ reason: { status: 409 } });
    expect(fixtures.state.memoryFiles).toHaveLength(1);
  });

  it.each(["foreign-user", "foreign-space", "failed", "deleting", "derivative", "missing"])(
    "rejects %s uploads without exposing metadata",
    async (scenario) => {
      const upload = fixtures.addUpload({ bytes });
      if (scenario === "foreign-user") upload.uploadedByUserId = "user-b";
      if (scenario === "foreign-space") upload.spaceId = randomUUID();
      if (scenario === "failed") upload.status = "failed";
      if (scenario === "deleting") upload.status = "deleting";
      if (scenario === "derivative") {
        upload.originalFileId = randomUUID();
        upload.variantName = "cover";
      }
      if (scenario === "missing") fixtures.state.uploads.delete(upload.id);
      await expect(
        fixtures.memories.create({ userId: "user-a", body: createMemoryRequest([upload.id]) }),
      ).rejects.toMatchObject({ status: 404 });
      expect(fixtures.state.memories).toHaveLength(0);
      expect(fixtures.storage.getObject).not.toHaveBeenCalled();
    },
  );

  it("rolls back memory, cover, assets, objects, consumption and events if an outbox insertion fails", async () => {
    const first = fixtures.addUpload({ bytes });
    const second = fixtures.addUpload({ bytes });
    fixtures.prisma.outboxEvent.create.mockImplementationOnce(async ({ data }) => {
      fixtures.state.events.push(data);
      return data;
    });
    fixtures.prisma.outboxEvent.create.mockRejectedValueOnce(new Error("outbox unavailable"));
    const request = { ...createMemoryRequest([first.id, second.id]), coverUploadId: first.id };
    await expect(fixtures.memories.create({ userId: "user-a", body: request })).rejects.toThrow(
      "outbox unavailable",
    );
    expect(fixtures.state.memories).toHaveLength(0);
    expect(fixtures.state.memoryFiles).toHaveLength(0);
    expect(fixtures.state.events).toHaveLength(0);
    expect(
      [...fixtures.state.uploads.values()].every(
        ({ status, operationLockToken }) => status === "uploaded" && operationLockToken === null,
      ),
    ).toBe(true);
    expect(fixtures.storageObjects.has(first.objectKey)).toBe(true);
    await fixtures.memories.create({ userId: "user-a", body: request });
    expect(fixtures.state.memories).toHaveLength(1);
    expect(fixtures.state.events).toHaveLength(2);
  });

  it("preserves the creation failure and releases claims when the recovery lookup fails", async () => {
    const upload = fixtures.addUpload({ bytes });
    const creationError = new Error("outbox unavailable");
    fixtures.prisma.outboxEvent.create.mockRejectedValueOnce(creationError);
    fixtures.prisma.memory.findUnique
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("recovery lookup unavailable"));

    await expect(
      fixtures.memories.create({ userId: "user-a", body: createMemoryRequest([upload.id]) }),
    ).rejects.toBe(creationError);

    expect(fixtures.state.memories).toHaveLength(0);
    expect(fixtures.state.uploads.get(upload.id)).toMatchObject({
      status: "uploaded",
      operationLockToken: null,
      operationLockExpiresAt: null,
    });
  });

  it("preserves the idempotency conflict when recovery finds a different committed input", async () => {
    await fixtures.memories.create({ userId: "user-a", body: createMemoryRequest() });
    fixtures.prisma.memory.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fixtures.state.memories[0]);

    await expect(
      fixtures.memories.create({
        userId: "user-a",
        body: { ...createMemoryRequest(), title: "Changed" },
      }),
    ).rejects.toMatchObject({
      status: 409,
      response: {
        errors: [expect.objectContaining({ code: "IDEMPOTENCY_CONFLICT" })],
      },
    });
  });

  it("rechecks active membership inside the consuming transaction", async () => {
    const upload = fixtures.addUpload({ bytes });
    fixtures.prisma.$queryRaw.mockResolvedValueOnce([]);
    await expect(
      fixtures.memories.create({ userId: "user-a", body: createMemoryRequest([upload.id]) }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fixtures.state.memories).toHaveLength(0);
    expect(fixtures.state.uploads.get(upload.id)?.status).toBe("uploaded");
  });

  it("rolls back when file operation ownership is superseded before attachment", async () => {
    const upload = fixtures.addUpload({ bytes });
    fixtures.prisma.$queryRaw.mockImplementationOnce(async () => {
      const current = fixtures.state.uploads.get(upload.id);
      if (current) {
        current.operationLockToken = randomUUID();
        current.operationLockExpiresAt = new Date(Date.now() + 120_000);
      }
      return [{ id: "member" }];
    });
    await expect(
      fixtures.memories.create({ userId: "user-a", body: createMemoryRequest([upload.id]) }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fixtures.state.memories).toHaveLength(0);
    expect(fixtures.state.events).toHaveLength(0);
    expect(fixtures.state.uploads.get(upload.id)?.status).toBe("uploaded");
  });
});
