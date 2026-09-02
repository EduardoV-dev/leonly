import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { cleanupMock, createAdminClientMock, validateInputMock } = vi.hoisted(() => ({
  cleanupMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  validateInputMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));
vi.mock("./edit-memory-input", () => ({ validateEditMemoryFormData: validateInputMock }));
vi.mock("./memory-edit-cleanup", () => ({
  cleanupMemoryEditAttempt: cleanupMock,
  cleanupStaleMemoryEdits: vi.fn(),
}));

import { editMemory } from "./edit-memory";
import { decodeMemoryVersion } from "./memory-version";

const USER_ID = "e951cd4b-7567-4b1e-a5d3-18aa810cbd8e";
const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const ATTEMPT_ID = "3ddf312a-e682-4cd8-91f9-9a2a230241ed";
const IDEMPOTENCY_KEY = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";
const UPDATED_AT = "2026-08-23T11:00:00.000Z";

const validInput = {
  coverNewPhotoIndex: null,
  coverPhotoId: null,
  description: "Updated description",
  expectedUpdatedAt: "2026-08-23T10:00:00.000Z",
  location: null,
  memoryDate: "2026-08-20",
  photos: [],
  requestFingerprint: "fingerprint",
  retainedPhotoIds: [],
  timezone: "UTC",
  title: "Updated title",
  visibility: "vault" as const,
};

function reservation(overrides: Record<string, unknown> = {}) {
  return {
    attempt_id: ATTEMPT_ID,
    is_new: true,
    memory_id: MEMORY_ID,
    outcome: "processing",
    result_updated_at: null,
    result_visibility: null,
    ...overrides,
  };
}

function admin(rpc: ReturnType<typeof vi.fn>, upload = vi.fn()) {
  return { rpc, storage: { from: vi.fn(() => ({ upload })) } };
}

describe("editMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateInputMock.mockResolvedValue(validInput);
    cleanupMock.mockResolvedValue(undefined);
  });

  it("returns the durable completed outcome without another upload or finalization", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        reservation({
          is_new: false,
          outcome: "completed",
          result_updated_at: UPDATED_AT,
          result_visibility: "timeline",
        }),
      ],
      error: null,
    });
    const client = admin(rpc);
    createAdminClientMock.mockReturnValue(client);

    const result = await editMemory(USER_ID, MEMORY_ID, IDEMPOTENCY_KEY, new FormData());

    expect(result).toMatchObject({ id: MEMORY_ID, reused: true, visibility: "timeline" });
    expect(decodeMemoryVersion(result.version)).toBe(UPDATED_AT);
    expect(rpc).toHaveBeenCalledOnce();
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it.each([
    ["conflict", "conflict", 409],
    ["unavailable", "unavailable", 404],
    ["processing", "pending", 409],
  ])("maps %s reservations without starting replacement work", async (outcome, code, status) => {
    const rpc = vi.fn().mockResolvedValue({
      data: [reservation({ is_new: false, outcome })],
      error: null,
    });
    const client = admin(rpc);
    createAdminClientMock.mockReturnValue(client);

    await expect(
      editMemory(USER_ID, MEMORY_ID, IDEMPOTENCY_KEY, new FormData()),
    ).rejects.toMatchObject({ code, status });
    expect(client.storage.from).not.toHaveBeenCalled();
    expect(cleanupMock).not.toHaveBeenCalled();
  });

  it("finalizes normalized metadata and remove-all as one RPC", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [reservation()], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            memory_id: MEMORY_ID,
            outcome: "completed",
            result_updated_at: UPDATED_AT,
            result_visibility: "vault",
          },
        ],
        error: null,
      });
    createAdminClientMock.mockReturnValue(admin(rpc));

    await expect(
      editMemory(USER_ID, MEMORY_ID, IDEMPOTENCY_KEY, new FormData()),
    ).resolves.toMatchObject({ id: MEMORY_ID, reused: false, visibility: "vault" });
    expect(rpc).toHaveBeenLastCalledWith("finalize_memory_edit_attempt", {
      p_attempt_id: ATTEMPT_ID,
      p_cover_photo_id: null,
      p_description: "Updated description",
      p_location: null,
      p_memory_date: "2026-08-20",
      p_retained_photo_ids: [],
      p_timezone: "UTC",
      p_title: "Updated title",
      p_visibility: "vault",
    });
    expect(cleanupMock).not.toHaveBeenCalled();
  });

  it("stages and uploads every private variant before atomic finalization", async () => {
    const photo = {
      bytes: new ArrayBuffer(1),
      contentType: "image/png",
      digest: "digest",
      variants: { cover: Buffer.from("cover"), detail: Buffer.from("detail") },
    };
    validateInputMock.mockResolvedValue({
      ...validInput,
      coverNewPhotoIndex: 0,
      photos: [photo],
    });
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [reservation()], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            cover_object_path: "space/edit/photo/cover.webp",
            detail_object_path: "space/edit/photo/detail.webp",
            object_path: "space/edit/photo/original",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: [
          {
            memory_id: MEMORY_ID,
            outcome: "completed",
            result_updated_at: UPDATED_AT,
            result_visibility: "vault",
          },
        ],
        error: null,
      });
    const upload = vi.fn().mockResolvedValue({ error: null });
    createAdminClientMock.mockReturnValue(admin(rpc, upload));

    await editMemory(USER_ID, MEMORY_ID, IDEMPOTENCY_KEY, new FormData());

    expect(upload).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenCalledWith("mark_memory_edit_photo_uploaded", {
      p_attempt_id: ATTEMPT_ID,
      p_photo_id: expect.any(String),
    });
    expect(rpc).toHaveBeenLastCalledWith(
      "finalize_memory_edit_attempt",
      expect.objectContaining({ p_cover_photo_id: expect.any(String) }),
    );
  });

  it("cleans failed new objects while preserving explicit conflict semantics", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [reservation()], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            memory_id: MEMORY_ID,
            outcome: "conflict",
            result_updated_at: null,
            result_visibility: null,
          },
        ],
        error: null,
      });
    createAdminClientMock.mockReturnValue(admin(rpc));

    await expect(
      editMemory(USER_ID, MEMORY_ID, IDEMPOTENCY_KEY, new FormData()),
    ).rejects.toMatchObject({ code: "conflict", status: 409 });
    expect(cleanupMock).toHaveBeenCalledWith(ATTEMPT_ID);
  });

  it("cleans staged objects after upload failure and returns a retryable safe error", async () => {
    validateInputMock.mockResolvedValue({
      ...validInput,
      coverNewPhotoIndex: 0,
      photos: [
        {
          bytes: new ArrayBuffer(1),
          contentType: "image/png",
          digest: "digest",
          variants: { cover: Buffer.from("cover"), detail: Buffer.from("detail") },
        },
      ],
    });
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [reservation()], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            cover_object_path: "private/cover.webp",
            detail_object_path: "private/detail.webp",
            object_path: "private/original",
          },
        ],
        error: null,
      });
    const upload = vi.fn().mockResolvedValue({ error: new Error("storage failed") });
    createAdminClientMock.mockReturnValue(admin(rpc, upload));

    await expect(
      editMemory(USER_ID, MEMORY_ID, IDEMPOTENCY_KEY, new FormData()),
    ).rejects.toMatchObject({ status: 500 });
    expect(cleanupMock).toHaveBeenCalledWith(ATTEMPT_ID);
  });
});
