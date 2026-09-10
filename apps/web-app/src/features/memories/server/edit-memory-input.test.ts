import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { validateEditMemoryFormData } from "./edit-memory-input";
import { encodeMemoryVersion } from "./memory-version";

const RETAINED_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const NEW_ID = "3ddf312a-e682-4cd8-91f9-9a2a230241ed";

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
  it("normalizes retained and staged photo metadata without image files", async () => {
    const value = formData();
    value.append("retainedPhotoIds", RETAINED_ID);
    value.append("photoIds", NEW_ID);
    value.append("photoNames", "replacement.webp");
    value.set("coverPhotoId", NEW_ID);

    await expect(validateEditMemoryFormData(value)).resolves.toMatchObject({
      coverPhotoId: NEW_ID,
      description: "A better description.",
      photos: [{ id: NEW_ID, name: "replacement.webp" }],
      retainedPhotoIds: [RETAINED_ID],
      title: "Revised picnic",
      visibility: "vault",
    });
  });

  it("allows removing every photo only when no cover is submitted", async () => {
    await expect(validateEditMemoryFormData(formData())).resolves.toMatchObject({
      coverPhotoId: null,
      photos: [],
      retainedPhotoIds: [],
    });

    const invalid = formData();
    invalid.set("coverPhotoId", RETAINED_ID);
    await expect(validateEditMemoryFormData(invalid)).rejects.toMatchObject({
      fields: { photos: "Choose one cover photo from the final photo set." },
    });
  });

  it("accepts the ten-photo final state", async () => {
    const value = formData();
    for (let index = 0; index < 10; index += 1) {
      value.append("retainedPhotoIds", crypto.randomUUID());
    }
    value.set("coverPhotoId", value.get("retainedPhotoIds") as string);

    await expect(validateEditMemoryFormData(value)).resolves.toMatchObject({
      retainedPhotoIds: expect.arrayContaining([value.get("coverPhotoId")]),
    });
  });

  it("rejects an edit with more than ten final photos", async () => {
    const value = formData();
    for (let index = 0; index < 10; index += 1) {
      value.append("retainedPhotoIds", crypto.randomUUID());
    }
    value.append("photoIds", NEW_ID);
    value.append("photoNames", "extra.png");
    value.set("coverPhotoId", NEW_ID);

    await expect(validateEditMemoryFormData(value)).rejects.toMatchObject({
      fields: { photos: "Choose up to 10 photos." },
    });
  });

  it("rejects malformed versions, duplicate retained IDs, and mismatched descriptors", async () => {
    const malformedVersion = formData();
    malformedVersion.set("expectedVersion", "not-a-version");
    await expect(validateEditMemoryFormData(malformedVersion)).rejects.toMatchObject({
      fields: { form: "Invalid memory version." },
    });

    const duplicate = formData();
    duplicate.append("retainedPhotoIds", RETAINED_ID);
    duplicate.append("retainedPhotoIds", RETAINED_ID);
    await expect(validateEditMemoryFormData(duplicate)).rejects.toMatchObject({
      fields: { photos: "A retained photo was included more than once." },
    });

    const mismatched = formData();
    mismatched.append("photoIds", NEW_ID);
    await expect(validateEditMemoryFormData(mismatched)).rejects.toMatchObject({
      fields: { photos: "Choose up to 10 photos." },
    });
  });
});
