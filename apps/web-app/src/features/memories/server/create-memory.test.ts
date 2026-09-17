import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { finalizeMock, prepareMock } = vi.hoisted(() => ({
  finalizeMock: vi.fn(),
  prepareMock: vi.fn(),
}));
vi.mock("./memory-attempt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./memory-attempt")>()),
  finalizeMemoryAttempt: finalizeMock,
  prepareMemoryAttempt: prepareMock,
}));

import { createMemory, prepareMemoryCreation, validateCreateMemoryFormData } from "./create-memory";

const ATTEMPT_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
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

describe("validateCreateMemoryFormData", () => {
  it("normalizes metadata without receiving image bytes", async () => {
    await expect(validateCreateMemoryFormData(formData(true))).resolves.toMatchObject({
      coverPhotoId: PHOTO_ID,
      description: "A sunny afternoon.",
      location: "The park",
      photos: [{ id: PHOTO_ID, name: "memory.png" }],
      title: "Our picnic",
    });
  });

  it("rejects duplicate IDs and invalid cover references", async () => {
    const duplicate = formData(true);
    duplicate.append("photoIds", PHOTO_ID);
    duplicate.append("photoNames", "second.png");
    await expect(validateCreateMemoryFormData(duplicate)).rejects.toMatchObject({
      fields: { photos: "A photo was included more than once." },
    });

    const invalidCover = formData();
    invalidCover.set("coverPhotoId", PHOTO_ID);
    await expect(validateCreateMemoryFormData(invalidCover)).rejects.toMatchObject({
      fields: { photos: "Choose one cover photo." },
    });
  });
});

describe("memory creation attempts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("always prepares one unified attempt, including metadata-only creation", async () => {
    prepareMock.mockResolvedValue({ attemptId: ATTEMPT_ID, uploads: [] });

    await expect(prepareMemoryCreation(formData())).resolves.toEqual({
      attemptId: ATTEMPT_ID,
      uploads: [],
    });
    expect(prepareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: [],
        attemptType: "create",
        memoryId: null,
      }),
    );
  });

  it("prepares ordered new assets and finalizes only by attempt ID", async () => {
    prepareMock.mockResolvedValue({
      attemptId: ATTEMPT_ID,
      uploads: [{ id: PHOTO_ID, path: "space/attempt/photo/original" }],
    });
    finalizeMock.mockResolvedValue({
      id: MEMORY_ID,
      updatedAt: "2026-08-23T11:00:00.000Z",
      visibility: "timeline",
    });

    await prepareMemoryCreation(formData(true));
    await expect(createMemory(ATTEMPT_ID)).resolves.toEqual({
      id: MEMORY_ID,
      visibility: "timeline",
    });
    expect(prepareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: [{ id: PHOTO_ID, isCover: true, isNew: true }],
      }),
    );
    expect(finalizeMock).toHaveBeenCalledWith(ATTEMPT_ID);
  });
});
