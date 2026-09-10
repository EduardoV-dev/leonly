import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  cleanupMock,
  createAdminClientMock,
  createClientMock,
  isReadyMock,
  processPhotoMock,
  validateInputMock,
} = vi.hoisted(() => ({
  cleanupMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  createClientMock: vi.fn(),
  isReadyMock: vi.fn(),
  processPhotoMock: vi.fn(),
  validateInputMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("./edit-memory-input", () => ({ validateEditMemoryFormData: validateInputMock }));
vi.mock("./memory-edit-cleanup", () => ({
  cleanupMemoryEditAttempt: cleanupMock,
  cleanupStaleMemoryEdits: vi.fn(),
}));
vi.mock("./process-staged-memory-photo", () => ({
  isStagedMemoryPhotoReady: isReadyMock,
  processStagedMemoryPhoto: processPhotoMock,
}));

import { editMemory, prepareMemoryEdit } from "./edit-memory";
import { decodeMemoryVersion } from "./memory-version";

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const ATTEMPT_ID = "3ddf312a-e682-4cd8-91f9-9a2a230241ed";
const IDEMPOTENCY_KEY = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";
const PHOTO_ID = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";
const UPDATED_AT = "2026-08-23T11:00:00.000Z";

const validInput = {
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

describe("memory editing upload lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateInputMock.mockResolvedValue(validInput);
    cleanupMock.mockResolvedValue(undefined);
    isReadyMock.mockResolvedValue(false);
    processPhotoMock.mockImplementation(async (_upload, markUploaded) => markUploaded());
  });

  it("returns a durable completed edit without further processing", async () => {
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
    createClientMock.mockResolvedValue({ rpc });

    const result = await editMemory(MEMORY_ID, IDEMPOTENCY_KEY, new FormData());
    expect(result).toMatchObject({ id: MEMORY_ID, reused: true, visibility: "timeline" });
    expect(decodeMemoryVersion(result.version)).toBe(UPDATED_AT);
    expect(rpc).toHaveBeenCalledOnce();
  });

  it.each([
    ["conflict", "conflict", 409],
    ["unavailable", "unavailable", 404],
  ])("maps %s reservations before staging uploads", async (outcome, code, status) => {
    const rpc = vi.fn().mockResolvedValue({
      data: [reservation({ is_new: false, outcome })],
      error: null,
    });
    createClientMock.mockResolvedValue({ rpc });

    await expect(editMemory(MEMORY_ID, IDEMPOTENCY_KEY, new FormData())).rejects.toMatchObject({
      code,
      status,
    });
    expect(cleanupMock).not.toHaveBeenCalled();
  });

  it("finalizes metadata-only edits without initializing storage", async () => {
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
    createClientMock.mockResolvedValue({ rpc });

    await expect(editMemory(MEMORY_ID, IDEMPOTENCY_KEY, new FormData())).resolves.toMatchObject({
      id: MEMORY_ID,
      visibility: "vault",
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("prepares direct upload paths and later processes the staged original", async () => {
    validateInputMock.mockResolvedValue({
      ...validInput,
      coverPhotoId: PHOTO_ID,
      photos: [{ id: PHOTO_ID, name: "replacement.png" }],
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
      });
    createClientMock.mockResolvedValue({ rpc });
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const query = { eq: vi.fn(), order };
    query.eq.mockReturnValue(query);
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => query) })),
    });

    await expect(prepareMemoryEdit(MEMORY_ID, IDEMPOTENCY_KEY, new FormData())).resolves.toEqual({
      result: null,
      uploads: [{ id: PHOTO_ID, path: "space/edit/photo/original" }],
    });
  });
});
