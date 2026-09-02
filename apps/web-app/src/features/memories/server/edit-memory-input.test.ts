import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createMemoryPhotoVariantsMock = vi.hoisted(() =>
  vi.fn(async () => ({ cover: Buffer.from("cover"), detail: Buffer.from("detail") })),
);

vi.mock("./create-memory-photo-variants", () => ({
  createMemoryPhotoVariants: createMemoryPhotoVariantsMock,
}));

import { validateEditMemoryFormData } from "./edit-memory-input";
import { encodeMemoryVersion } from "./memory-version";

const PHOTO_IDS = [
  "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  "3ddf312a-e682-4cd8-91f9-9a2a230241ed",
  "64d44f34-c5fe-482a-b65b-f91d0173b7fe",
  "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
  "cc2df916-833a-4f1b-b744-b7b4c176ae93",
];

function formData(): FormData {
  const value = new FormData();
  value.set("title", "  Revised picnic  ");
  value.set("description", "  A better description.  ");
  value.set("location", "  The park  ");
  value.set("memoryDate", "2020-08-20");
  value.set("timezone", "UTC");
  value.set("visibility", "vault");
  value.set("expectedVersion", encodeMemoryVersion("2026-08-23T10:00:00.000Z"));
  return value;
}

describe("validateEditMemoryFormData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes details and treats retained request order as insignificant", async () => {
    const value = formData();
    value.append("retainedPhotoIds", PHOTO_IDS[1]);
    value.append("retainedPhotoIds", PHOTO_IDS[0]);
    value.set("coverPhotoId", PHOTO_IDS[0]);

    await expect(validateEditMemoryFormData(value)).resolves.toMatchObject({
      coverPhotoId: PHOTO_IDS[0],
      description: "A better description.",
      location: "The park",
      retainedPhotoIds: [PHOTO_IDS[0], PHOTO_IDS[1]],
      title: "Revised picnic",
      visibility: "vault",
    });
  });

  it("allows removing every photo only with no cover", async () => {
    await expect(validateEditMemoryFormData(formData())).resolves.toMatchObject({
      coverNewPhotoIndex: null,
      coverPhotoId: null,
      photos: [],
      retainedPhotoIds: [],
    });
  });

  it("enforces the five-photo final state independently of create's ten-photo limit", async () => {
    const value = formData();
    for (const photoId of PHOTO_IDS) {
      value.append("retainedPhotoIds", photoId);
    }
    value.set("coverPhotoId", PHOTO_IDS[0]);
    value.append("photos", new File([], "extra.png", { type: "image/png" }));

    await expect(validateEditMemoryFormData(value)).rejects.toMatchObject({
      fields: { photos: "Choose up to 5 photos." },
    });
  });

  it("rejects malformed versions, foreign covers, and duplicate retained IDs", async () => {
    const malformedVersion = formData();
    malformedVersion.set("expectedVersion", "not-a-version");
    await expect(validateEditMemoryFormData(malformedVersion)).rejects.toMatchObject({
      fields: { form: "Invalid memory version." },
    });

    const foreignCover = formData();
    foreignCover.append("retainedPhotoIds", PHOTO_IDS[0]);
    foreignCover.set("coverPhotoId", PHOTO_IDS[1]);
    await expect(validateEditMemoryFormData(foreignCover)).rejects.toMatchObject({
      fields: { photos: "Choose one cover photo from the final photo set." },
    });

    const duplicate = formData();
    duplicate.append("retainedPhotoIds", PHOTO_IDS[0]);
    duplicate.append("retainedPhotoIds", PHOTO_IDS[0]);
    await expect(validateEditMemoryFormData(duplicate)).rejects.toMatchObject({
      fields: { photos: "A retained photo was included more than once." },
    });
  });
});
