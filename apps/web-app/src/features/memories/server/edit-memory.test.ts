import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { finalizeMock, prepareMock, validateInputMock } = vi.hoisted(() => ({
  finalizeMock: vi.fn(),
  prepareMock: vi.fn(),
  validateInputMock: vi.fn(),
}));
vi.mock("./edit-memory-input", () => ({ validateEditMemoryFormData: validateInputMock }));
vi.mock("./memory-attempt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./memory-attempt")>()),
  finalizeMemoryAttempt: finalizeMock,
  prepareMemoryAttempt: prepareMock,
}));

import { editMemory, prepareMemoryEdit } from "./edit-memory";
import { decodeMemoryVersion } from "./memory-version";

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const ATTEMPT_ID = "3ddf312a-e682-4cd8-91f9-9a2a230241ed";
const PHOTO_ID = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";
const RETAINED_ID = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";
const UPDATED_AT = "2026-08-23T11:00:00.000Z";

const validInput = {
  assetIds: [RETAINED_ID, PHOTO_ID],
  coverPhotoId: PHOTO_ID,
  description: "Updated description",
  expectedUpdatedAt: "2026-08-23T10:00:00.000Z",
  location: null,
  memoryDate: "2026-08-20",
  photos: [{ id: PHOTO_ID, name: "replacement.png" }],
  retainedPhotoIds: [RETAINED_ID],
  timezone: "UTC",
  title: "Updated title",
  visibility: "vault" as const,
};

describe("memory editing attempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateInputMock.mockResolvedValue(validInput);
  });

  it("prepares retained and new assets in final display order", async () => {
    prepareMock.mockResolvedValue({ attemptId: ATTEMPT_ID, uploads: [] });

    await prepareMemoryEdit(MEMORY_ID, new FormData());

    expect(prepareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: [
          { id: RETAINED_ID, isCover: false, isNew: false },
          { id: PHOTO_ID, isCover: true, isNew: true },
        ],
        attemptType: "edit",
        expectedUpdatedAt: validInput.expectedUpdatedAt,
        memoryId: MEMORY_ID,
      }),
    );
  });

  it("finalizes by attempt ID and returns the encoded memory version", async () => {
    finalizeMock.mockResolvedValue({
      id: MEMORY_ID,
      updatedAt: UPDATED_AT,
      visibility: "vault",
    });

    const result = await editMemory(ATTEMPT_ID);

    expect(result).toMatchObject({ id: MEMORY_ID, visibility: "vault" });
    expect(decodeMemoryVersion(result.version)).toBe(UPDATED_AT);
    expect(finalizeMock).toHaveBeenCalledWith(ATTEMPT_ID);
  });
});
