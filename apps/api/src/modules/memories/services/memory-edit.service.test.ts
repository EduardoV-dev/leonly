import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEditFixtures,
  createEditSaveRequest,
  EDIT_MEMORY_ID,
  type EditSaveRequest,
  formatToken,
  INITIAL_EDIT_TOKEN,
} from "../../../app/tests/edit-fixtures";
import type { EditMemoryDto } from "../dtos/edit-memory.dto";

async function toPhotoBytes(): Promise<Buffer> {
  return sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } })
    .png()
    .toBuffer();
}

function editBody(overrides: Partial<EditSaveRequest>): EditMemoryDto {
  return createEditSaveRequest(overrides) as EditMemoryDto;
}

// With fake time fixed at this instant, a first save advances the token to exactly now.
const FIRST_SAVE_TOKEN = formatToken(new Date("2026-10-11T00:00:00.000Z"));

describe("atomic memory edit save", () => {
  let fixtures: Awaited<ReturnType<typeof createEditFixtures>>;
  let bytes: Buffer;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T00:00:00Z"));
    fixtures = await createEditFixtures();
    bytes = await toPhotoBytes();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("commits a metadata-only edit without image events and returns the advanced token", async () => {
    fixtures.addMemory({ attachmentIds: [], coverFileId: null });
    const result = await fixtures.edits.save({
      userId: "user-a",
      memoryId: EDIT_MEMORY_ID,
      body: editBody({ title: "  Changed\r\npicnic  ", description: "  ", location: "Lake" }),
    });

    expect(result).toMatchObject({ id: EDIT_MEMORY_ID, visibility: "timeline" });
    expect(result.updatedAt).not.toBe(formatToken(INITIAL_EDIT_TOKEN));
    expect(fixtures.state.memories[0]).toMatchObject({
      title: "Changed\npicnic",
      description: null,
      location: "Lake",
      memoryDate: new Date("2026-10-10T00:00:00.000Z"),
    });
    expect(fixtures.state.events).toHaveLength(0);
    expect(fixtures.publisher.publish).not.toHaveBeenCalled();
    expect(fixtures.state.rollbacks).toBe(0);
  });

  it("commits retained relative order, appended additions, and one event per addition", async () => {
    const photoA = fixtures.addUpload({ bytes });
    const photoB = fixtures.addUpload({ bytes });
    const photoC = fixtures.addUpload({ bytes });
    const addition = fixtures.addUpload({ bytes, overrides: { status: "uploaded" } });
    fixtures.addMemory({
      attachmentIds: [photoA.id, photoB.id, photoC.id],
      coverFileId: photoA.id,
    });

    const result = await fixtures.edits.save({
      userId: "user-a",
      memoryId: EDIT_MEMORY_ID,
      body: editBody({
        retainedPhotoIds: [photoC.id, photoA.id],
        uploadIds: [addition.id],
        coverFileId: photoC.id,
      }),
    });

    expect(result.updatedAt).toBe(FIRST_SAVE_TOKEN);
    expect(
      fixtures.state.memoryFiles.map(({ fileId, position }) => ({ fileId, position })),
    ).toEqual([
      { fileId: photoA.id, position: 0 },
      { fileId: photoC.id, position: 1 },
      { fileId: addition.id, position: 2 },
    ]);
    expect(fixtures.state.memories[0]?.coverFileId).toBe(photoC.id);
    expect(fixtures.state.uploads.get(photoB.id)).toMatchObject({ status: "deleting" });
    expect(fixtures.state.uploads.get(addition.id)).toMatchObject({
      status: "uploaded",
      operationLockToken: null,
    });
    expect(fixtures.state.events).toHaveLength(1);
    expect(fixtures.state.events[0]).toMatchObject({
      entityType: "file",
      entityId: addition.id,
      eventType: "ImageVariantsRequested",
      payload: { memoryId: EDIT_MEMORY_ID, spaceId: fixtures.state.memories[0]?.spaceId },
    });
    expect(fixtures.publisher.publish).toHaveBeenCalledTimes(1);
  });

  it("authorizes retained partner photos by attachment and clears removed covers", async () => {
    const partnerPhoto = fixtures.addUpload({
      bytes,
      overrides: { uploadedByUserId: "user-b", status: "uploaded" },
    });
    const replacement = fixtures.addUpload({ bytes, overrides: { status: "uploaded" } });
    fixtures.addMemory({ attachmentIds: [partnerPhoto.id], coverFileId: partnerPhoto.id });

    await fixtures.edits.save({
      userId: "user-a",
      memoryId: EDIT_MEMORY_ID,
      body: editBody({
        retainedPhotoIds: [partnerPhoto.id],
        coverFileId: replacement.id,
        uploadIds: [replacement.id],
      }),
    });

    expect(
      fixtures.state.memoryFiles.map(({ fileId, position }) => ({ fileId, position })),
    ).toEqual([
      { fileId: partnerPhoto.id, position: 0 },
      { fileId: replacement.id, position: 1 },
    ]);
    expect(fixtures.state.uploads.get(partnerPhoto.id)).toMatchObject({ status: "uploaded" });
    expect(fixtures.state.memories[0]?.coverFileId).toBe(replacement.id);
  });

  it("commits remove-all by clearing associations, cover, and retiring families", async () => {
    const photoA = fixtures.addUpload({ bytes });
    const photoB = fixtures.addUpload({ bytes });
    fixtures.addMemory({ attachmentIds: [photoA.id, photoB.id], coverFileId: photoB.id });

    const result = await fixtures.edits.save({
      userId: "user-a",
      memoryId: EDIT_MEMORY_ID,
      body: editBody({}),
    });

    expect(result.updatedAt).toBe(FIRST_SAVE_TOKEN);
    expect(fixtures.state.memoryFiles).toHaveLength(0);
    expect(fixtures.state.memories[0]?.coverFileId).toBeNull();
    expect(fixtures.state.uploads.get(photoA.id)).toMatchObject({ status: "deleting" });
    expect(fixtures.state.uploads.get(photoB.id)).toMatchObject({ status: "deleting" });
    expect(fixtures.state.events).toHaveLength(0);
  });

  it("rejects foreign retained references and releases confirmed uploads", async () => {
    const retained = fixtures.addUpload({ bytes });
    const addition = fixtures.addUpload({ bytes, overrides: { status: "uploaded" } });
    fixtures.addMemory({ attachmentIds: [retained.id] });

    await expect(
      fixtures.edits.save({
        userId: "user-a",
        memoryId: EDIT_MEMORY_ID,
        body: editBody({ retainedPhotoIds: [retained.id, randomUUID()], uploadIds: [addition.id] }),
      }),
    ).rejects.toMatchObject({
      status: 400,
      response: { errors: [expect.objectContaining({ code: "INVALID_PHOTO_REFERENCE" })] },
    });

    expect(fixtures.state.memoryFiles).toHaveLength(1);
    expect(fixtures.state.uploads.get(addition.id)).toMatchObject({
      operationLockToken: null,
    });
    expect(fixtures.state.rollbacks).toBe(1);
  });

  it("rejects foreign or consumed upload references as invalid input", async () => {
    const foreignUpload = fixtures.addUpload({ bytes, overrides: { uploadedByUserId: "user-b" } });
    fixtures.addMemory({});

    await expect(
      fixtures.edits.save({
        userId: "user-a",
        memoryId: EDIT_MEMORY_ID,
        body: editBody({ uploadIds: [foreignUpload.id] }),
      }),
    ).rejects.toMatchObject({
      status: 400,
      response: { errors: [expect.objectContaining({ code: "INVALID_PHOTO_REFERENCE" })] },
    });
    expect(fixtures.state.memoryFiles).toHaveLength(0);
  });

  it("rejects a stale token while the memory stays available", async () => {
    fixtures.addMemory({ attachmentIds: [] });

    const first = await fixtures.edits.save({
      userId: "user-a",
      memoryId: EDIT_MEMORY_ID,
      body: editBody({ title: "First" }),
    });
    const advancedToken = formatToken(new Date(first.updatedAt));

    await expect(
      fixtures.edits.save({
        userId: "user-a",
        memoryId: EDIT_MEMORY_ID,
        body: editBody({ lastKnownUpdatedAt: INITIAL_EDIT_TOKEN.toISOString() }),
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(advancedToken).toBe(FIRST_SAVE_TOKEN);
    expect(fixtures.state.memories[0]?.title).toBe("First");
    expect(fixtures.state.rollbacks).toBe(1);
  });

  it("reports stale when a placement update advances the token before Save", async () => {
    fixtures.addMemory({ attachmentIds: [] });
    // A committed placement update advances the same concurrency boundary first.
    const memory = fixtures.state.memories[0];
    if (!memory) throw new Error("Missing fixture memory");
    memory.updatedAt = new Date(INITIAL_EDIT_TOKEN.getTime() + 1);

    await expect(
      fixtures.edits.save({ userId: "user-a", memoryId: EDIT_MEMORY_ID, body: editBody({}) }),
    ).rejects.toMatchObject({ status: 409 });
    expect(memory.title).toBe("Our picnic");
  });

  it("reports unavailable instead of stale when deletion wins the race", async () => {
    fixtures.addMemory({ attachmentIds: [] });
    fixtures.prisma.memory.findFirst.mockImplementationOnce(async () => ({ id: EDIT_MEMORY_ID }));
    const memory = fixtures.state.memories[0];
    if (!memory) throw new Error("Missing fixture memory");
    memory.deletedAt = new Date();

    await expect(
      fixtures.edits.save({ userId: "user-a", memoryId: EDIT_MEMORY_ID, body: editBody({}) }),
    ).rejects.toMatchObject({ status: 404, response: { error: "Memory unavailable." } });
  });

  it("advances the token on rapid no-op saves so the previous token cannot be reused", async () => {
    fixtures.addMemory({ attachmentIds: [] });
    const first = await fixtures.edits.save({
      userId: "user-a",
      memoryId: EDIT_MEMORY_ID,
      body: editBody({}),
    });
    const second = await fixtures.edits.save({
      userId: "user-a",
      memoryId: EDIT_MEMORY_ID,
      body: editBody({ lastKnownUpdatedAt: first.updatedAt }),
    });

    expect(new Date(second.updatedAt).getTime()).toBeGreaterThan(
      new Date(first.updatedAt).getTime(),
    );
    await expect(
      fixtures.edits.save({
        userId: "user-a",
        memoryId: EDIT_MEMORY_ID,
        body: editBody({ lastKnownUpdatedAt: first.updatedAt }),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("serializes concurrent edits so exactly one commits per token", async () => {
    fixtures.addMemory({ attachmentIds: [] });
    const body = editBody({ title: "Concurrent" });
    const results = await Promise.allSettled([
      fixtures.edits.save({ userId: "user-a", memoryId: EDIT_MEMORY_ID, body }),
      fixtures.edits.save({ userId: "user-a", memoryId: EDIT_MEMORY_ID, body }),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.find(({ status }) => status === "rejected")).toMatchObject({
      reason: { status: 409 },
    });
    expect(fixtures.state.memories[0]?.title).toBe("Concurrent");
  });

  it("rolls back and reports conflict when a newer claim supersedes the save inside the transaction", async () => {
    const addition = fixtures.addUpload({ bytes, overrides: { status: "uploaded" } });
    fixtures.addMemory({});
    const runTransaction = fixtures.prisma.$transaction.getMockImplementation();
    if (!runTransaction) throw new Error("Missing transaction fixture");
    fixtures.prisma.$transaction.mockImplementationOnce(async (operation) => {
      // A worker claim may commit between confirmation and the save transaction.
      const upload = fixtures.state.uploads.get(addition.id);
      if (!upload) throw new Error("Missing upload fixture");
      upload.operationLockToken = randomUUID();
      upload.operationLockExpiresAt = new Date(Date.now() + 120_000);

      return runTransaction(operation);
    });

    await expect(
      fixtures.edits.save({
        userId: "user-a",
        memoryId: EDIT_MEMORY_ID,
        body: editBody({ uploadIds: [addition.id] }),
      }),
    ).rejects.toMatchObject({
      status: 409,
      response: { errors: [expect.objectContaining({ code: "PHOTO_CLAIM_CONFLICT" })] },
    });

    expect(fixtures.state.memoryFiles).toHaveLength(0);
    expect(fixtures.state.events).toHaveLength(0);
    expect(fixtures.state.uploads.get(addition.id)?.operationLockToken).not.toBeNull();
    expect(fixtures.state.memories[0]?.updatedAt.getTime()).toBe(INITIAL_EDIT_TOKEN.getTime());
  });

  it("rolls back the whole edit when an outbox event cannot be persisted", async () => {
    const addition = fixtures.addUpload({ bytes, overrides: { status: "uploaded" } });
    fixtures.addMemory({ attachmentIds: [], coverFileId: null });
    fixtures.prisma.outboxEvent.create.mockRejectedValueOnce(new Error("outbox unavailable"));

    await expect(
      fixtures.edits.save({
        userId: "user-a",
        memoryId: EDIT_MEMORY_ID,
        body: editBody({ title: "Changed", uploadIds: [addition.id] }),
      }),
    ).rejects.toThrow("outbox unavailable");

    expect(fixtures.state.memories[0]?.title).toBe("Our picnic");
    expect(fixtures.state.memoryFiles).toHaveLength(0);
    expect(fixtures.state.events).toHaveLength(0);
    expect(fixtures.state.uploads.get(addition.id)).toMatchObject({
      status: "uploaded",
      operationLockToken: null,
    });
  });

  it("keeps a committed save successful when post-commit publication fails", async () => {
    const addition = fixtures.addUpload({ bytes, overrides: { status: "uploaded" } });
    fixtures.addMemory({});
    fixtures.publisher.publish.mockRejectedValueOnce(new Error("queue unavailable"));

    const result = await fixtures.edits.save({
      userId: "user-a",
      memoryId: EDIT_MEMORY_ID,
      body: editBody({ uploadIds: [addition.id], coverFileId: addition.id }),
    });

    expect(result).toMatchObject({ id: EDIT_MEMORY_ID, visibility: "timeline" });
    expect(fixtures.state.memoryFiles).toHaveLength(1);
    expect(fixtures.state.events).toHaveLength(1);
    expect(fixtures.state.uploads.get(addition.id)?.operationLockToken).toBeNull();
  });

  it("reports unavailable when the active space disappears before the save", async () => {
    fixtures.addMemory({});
    fixtures.state.hasActiveMembership = false;

    await expect(
      fixtures.edits.save({ userId: "user-a", memoryId: EDIT_MEMORY_ID, body: editBody({}) }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fixtures.state.memories[0]?.updatedAt.getTime()).toBe(INITIAL_EDIT_TOKEN.getTime());
  });
});
