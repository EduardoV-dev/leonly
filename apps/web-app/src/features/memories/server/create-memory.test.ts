import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { cleanupMock, createClientMock, isReadyMock, processPhotoMock } = vi.hoisted(() => ({
  cleanupMock: vi.fn(),
  createClientMock: vi.fn(),
  isReadyMock: vi.fn(),
  processPhotoMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("./memory-photo-staging-cleanup", () => ({
  cleanupMemoryCreationAttempt: cleanupMock,
  cleanupStaleMemoryPhotoStaging: vi.fn(),
}));
vi.mock("./process-staged-memory-photo", () => ({
  isStagedMemoryPhotoReady: isReadyMock,
  processStagedMemoryPhoto: processPhotoMock,
}));

import { createMemory, prepareMemoryCreation, validateCreateMemoryFormData } from "./create-memory";

const ATTEMPT_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const IDEMPOTENCY_KEY = "3ddf312a-e682-4cd8-91f9-9a2a230241ed";
const MEMORY_ID = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";
const PHOTO_ID = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";

function formData(withPhoto = false): FormData {
  const value = new FormData();
  value.set("title", "  Our picnic  ");
  value.set("description", "  A sunny afternoon.  ");
  value.set("location", "  The park  ");
  value.set("memoryDate", "2020-08-20");
  value.set("timezone", "UTC");
  value.set("visibility", "timeline");
  if (withPhoto) {
    value.append("photoIds", PHOTO_ID);
    value.append("photoNames", "memory.png");
    value.set("coverPhotoId", PHOTO_ID);
  }
  return value;
}

function reservation(overrides: Record<string, unknown> = {}) {
  return {
    attempt_id: ATTEMPT_ID,
    is_new: true,
    memory_id: null,
    status: "processing",
    ...overrides,
  };
}

function client(rpc: ReturnType<typeof vi.fn>) {
  return { rpc };
}

describe("validateCreateMemoryFormData", () => {
  it("normalizes metadata without receiving image bytes", async () => {
    await expect(validateCreateMemoryFormData(formData(true))).resolves.toMatchObject({
      coverPhotoId: PHOTO_ID,
      description: "A sunny afternoon.",
      location: "The park",
      photos: [{ id: PHOTO_ID, name: "memory.png" }],
      title: "Our picnic",
    });
    expect(formData(true).getAll("photos")).toEqual([]);
  });

  it("rejects duplicate IDs, unsupported names, and invalid cover references", async () => {
    const duplicate = formData(true);
    duplicate.append("photoIds", PHOTO_ID);
    duplicate.append("photoNames", "second.png");
    await expect(validateCreateMemoryFormData(duplicate)).rejects.toMatchObject({
      fields: { photos: "A photo was included more than once." },
    });

    const unsupported = formData();
    unsupported.append("photoIds", PHOTO_ID);
    unsupported.append("photoNames", "memory.gif");
    unsupported.set("coverPhotoId", PHOTO_ID);
    await expect(validateCreateMemoryFormData(unsupported)).rejects.toMatchObject({
      fields: { photos: "Photos must use a JPG, JPEG, PNG, or WebP extension." },
    });

    const invalidCover = formData();
    invalidCover.set("coverPhotoId", PHOTO_ID);
    await expect(validateCreateMemoryFormData(invalidCover)).rejects.toMatchObject({
      fields: { photos: "Choose one cover photo." },
    });
  });

  it("rejects legacy requests that include image bytes", async () => {
    const value = formData();
    value.append("photos", new File(["image bytes"], "legacy.png", { type: "image/png" }));

    await expect(validateCreateMemoryFormData(value)).rejects.toMatchObject({
      fields: { photos: "Upload photos directly before saving the memory." },
    });
  });
});

describe("memory creation upload lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupMock.mockResolvedValue(undefined);
    isReadyMock.mockResolvedValue(false);
    processPhotoMock.mockImplementation(async (_upload, markUploaded) => markUploaded());
  });

  it("returns the durable completed result without preparing another upload", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [reservation({ is_new: false, memory_id: MEMORY_ID, status: "completed" })],
      error: null,
    });
    createClientMock.mockResolvedValue(client(rpc));

    await expect(prepareMemoryCreation(IDEMPOTENCY_KEY, formData())).resolves.toEqual({
      result: { id: MEMORY_ID, reused: true },
      uploads: [],
    });
  });

  it("prepares an authorized object path without uploading image bytes", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [reservation()], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            cover_object_path: "space/attempt/photo/cover.webp",
            detail_object_path: "space/attempt/photo/detail.webp",
            object_path: "space/attempt/photo/original",
          },
        ],
        error: null,
      });
    createClientMock.mockResolvedValue(client(rpc));

    await expect(prepareMemoryCreation(IDEMPOTENCY_KEY, formData(true))).resolves.toEqual({
      result: null,
      uploads: [{ id: PHOTO_ID, path: "space/attempt/photo/original" }],
    });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("processes staged objects and finalizes only their durable IDs and paths", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [reservation({ is_new: false })], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            cover_object_path: "space/attempt/photo/cover.webp",
            detail_object_path: "space/attempt/photo/detail.webp",
            object_path: "space/attempt/photo/original",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: MEMORY_ID, error: null });
    createClientMock.mockResolvedValue(client(rpc));

    await expect(createMemory(IDEMPOTENCY_KEY, formData(true))).resolves.toEqual({
      id: MEMORY_ID,
      reused: false,
    });
    expect(processPhotoMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: PHOTO_ID, originalPath: "space/attempt/photo/original" }),
      expect.any(Function),
    );
    expect(rpc).toHaveBeenLastCalledWith(
      "finalize_memory_creation_attempt",
      expect.objectContaining({ p_cover_photo_id: PHOTO_ID }),
    );
  });

  it("revalidates an already-marked original before retry finalization", async () => {
    isReadyMock.mockResolvedValue(true);
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [reservation({ is_new: false })], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            cover_object_path: "space/attempt/photo/cover.webp",
            detail_object_path: "space/attempt/photo/detail.webp",
            object_path: "space/attempt/photo/original",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: MEMORY_ID, error: null });
    createClientMock.mockResolvedValue(client(rpc));

    await createMemory(IDEMPOTENCY_KEY, formData(true));

    expect(processPhotoMock).toHaveBeenCalledOnce();
    expect(rpc).not.toHaveBeenCalledWith("mark_memory_photo_uploaded", expect.anything());
  });

  it("cleans the attempt when finalization fails", async () => {
    const failure = new Error("database failed");
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [reservation()], error: null })
      .mockResolvedValueOnce({ data: null, error: failure });
    createClientMock.mockResolvedValue(client(rpc));

    await expect(createMemory(IDEMPOTENCY_KEY, formData())).rejects.toMatchObject({ status: 500 });
    expect(cleanupMock).toHaveBeenCalledWith(ATTEMPT_ID);
  });
});
