import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createAdminClientMock = vi.hoisted(() => vi.fn());
const createMemoryPhotoVariantsMock = vi.hoisted(() =>
  vi.fn(async () => ({ cover: Buffer.from("cover"), detail: Buffer.from("detail") })),
);

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));
vi.mock("./create-memory-photo-variants", () => ({
  createMemoryPhotoVariants: createMemoryPhotoVariantsMock,
}));

import { createMemory, validateCreateMemoryFormData } from "./create-memory";

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const bytes = Buffer.from(value, "base64");
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function bytesFromNumbers(values: number[]): ArrayBuffer {
  return Uint8Array.from(values).buffer;
}

const photoFixtures = {
  jpg: base64ToArrayBuffer(
    "/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpAB//Z",
  ),
  png: base64ToArrayBuffer(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC",
  ),
  webp: base64ToArrayBuffer("UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vz0AAA="),
};

function createPhoto(name: string, bytes: ArrayBuffer, type = "image/png"): File {
  const photo = new File([bytes], name, { type });
  Object.defineProperty(photo, "arrayBuffer", { value: async () => bytes });
  return photo;
}

function createFormData(): FormData {
  const formData = new FormData();
  formData.set("title", "  Our picnic  ");
  formData.set("description", "  A sunny afternoon.  ");
  formData.set("location", "  The park  ");
  formData.set("memoryDate", "2020-08-20");
  formData.set("timezone", "UTC");
  formData.set("visibility", "timeline");
  return formData;
}

describe("validateCreateMemoryFormData", () => {
  it("normalizes valid no-photo memory details", async () => {
    await expect(validateCreateMemoryFormData(createFormData())).resolves.toMatchObject({
      coverPhotoIndex: null,
      description: "A sunny afternoon.",
      location: "The park",
      memoryDate: "2020-08-20",
      photos: [],
      title: "Our picnic",
      visibility: "timeline",
    });
  });

  it("rejects future or malformed dates before creating an attempt", async () => {
    const formData = createFormData();
    formData.set("memoryDate", "not-a-date");

    await expect(validateCreateMemoryFormData(formData)).rejects.toMatchObject({
      fields: { memoryDate: "Choose a valid date." },
    });
  });

  it("rejects missing titles and invalid placement", async () => {
    const formData = createFormData();
    formData.set("title", "   ");
    formData.set("visibility", "other-space");

    await expect(validateCreateMemoryFormData(formData)).rejects.toMatchObject({
      fields: { title: "Required." },
    });
  });

  it("accepts ten photos and rejects an eleventh", async () => {
    const validFormData = createFormData();
    for (let index = 0; index < 10; index += 1) {
      validFormData.append("photos", createPhoto(`${index}.png`, photoFixtures.png));
    }
    validFormData.set("coverPhotoIndex", "0");

    await expect(validateCreateMemoryFormData(validFormData)).resolves.toMatchObject({
      coverPhotoIndex: 0,
      photos: expect.arrayContaining([expect.objectContaining({ contentType: "image/png" })]),
    });

    const invalidFormData = createFormData();
    for (let index = 0; index < 11; index += 1) {
      invalidFormData.append("photos", createPhoto(`${index}.png`, photoFixtures.png));
    }
    invalidFormData.set("coverPhotoIndex", "0");

    await expect(validateCreateMemoryFormData(invalidFormData)).rejects.toMatchObject({
      fields: { photos: "Choose up to 10 photos." },
    });
  });

  it.each([
    ["memory.jpg", photoFixtures.jpg, "image/jpeg"],
    ["memory.JPEG", photoFixtures.jpg, "image/jpeg"],
    ["memory.png", photoFixtures.png, "image/png"],
    ["memory.webp", photoFixtures.webp, "image/webp"],
  ])("accepts a matching %s image signature", async (name, bytes, contentType) => {
    const formData = createFormData();
    formData.append("photos", createPhoto(name, bytes));
    formData.set("coverPhotoIndex", "0");

    await expect(validateCreateMemoryFormData(formData)).resolves.toMatchObject({
      photos: [expect.objectContaining({ contentType })],
    });
  });

  it("ignores a spoofed browser MIME type when the image signature and extension match", async () => {
    const formData = createFormData();
    formData.append("photos", createPhoto("memory.png", photoFixtures.png, "application/pdf"));
    formData.set("coverPhotoIndex", "0");

    await expect(validateCreateMemoryFormData(formData)).resolves.toMatchObject({
      photos: [expect.objectContaining({ contentType: "image/png" })],
    });
  });

  it("rejects an unsupported extension before image processing", async () => {
    const formData = createFormData();
    formData.append("photos", createPhoto("memory.gif", photoFixtures.png));
    formData.set("coverPhotoIndex", "0");

    await expect(validateCreateMemoryFormData(formData)).rejects.toMatchObject({
      fields: { photos: "Photos must use a JPG, JPEG, PNG, or WebP extension." },
    });
  });

  it("rejects an image when its extension does not match the detected signature", async () => {
    const formData = createFormData();
    formData.append("photos", createPhoto("memory.jpg", photoFixtures.png));
    formData.set("coverPhotoIndex", "0");

    await expect(validateCreateMemoryFormData(formData)).rejects.toMatchObject({
      fields: { photos: "Photo file extensions must match their image type." },
    });
  });

  it("rejects random bytes with an allowed extension", async () => {
    const formData = createFormData();
    formData.append("photos", createPhoto("memory.png", bytesFromNumbers([0x00, 0x01, 0x02])));
    formData.set("coverPhotoIndex", "0");

    await expect(validateCreateMemoryFormData(formData)).rejects.toMatchObject({
      fields: { photos: "Photos must be JPEG, PNG, or WebP images." },
    });
  });
});

describe("createMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMemoryPhotoVariantsMock.mockResolvedValue({
      cover: Buffer.from("cover"),
      detail: Buffer.from("detail"),
    });
  });

  function createAdminClient(rpc: ReturnType<typeof vi.fn>) {
    return { rpc, storage: { from: vi.fn() } };
  }

  it("returns the original memory without another finalization after a lost response", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          attempt_id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
          is_new: false,
          memory_id: "3ddf312a-e682-4cd8-91f9-9a2a230241ed",
          status: "completed",
        },
      ],
      error: null,
    });
    createAdminClientMock.mockReturnValue(createAdminClient(rpc));

    await expect(
      createMemory("member-id", "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0", createFormData()),
    ).resolves.toEqual({ id: "3ddf312a-e682-4cd8-91f9-9a2a230241ed", reused: true });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("reserve_memory_creation_attempt", expect.any(Object));
  });

  it("does not start a second workflow while the original attempt is processing", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          attempt_id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
          is_new: false,
          memory_id: null,
          status: "processing",
        },
      ],
      error: null,
    });
    createAdminClientMock.mockReturnValue(createAdminClient(rpc));

    await expect(
      createMemory("member-id", "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0", createFormData()),
    ).rejects.toMatchObject({ status: 409 });

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("finalizes a new no-photo memory with only server-derived attempt data", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            attempt_id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
            is_new: true,
            memory_id: null,
            status: "processing",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: "3ddf312a-e682-4cd8-91f9-9a2a230241ed", error: null });
    createAdminClientMock.mockReturnValue(createAdminClient(rpc));

    await expect(
      createMemory("member-id", "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0", createFormData()),
    ).resolves.toEqual({ id: "3ddf312a-e682-4cd8-91f9-9a2a230241ed", reused: false });

    expect(rpc).toHaveBeenLastCalledWith("finalize_memory_creation_attempt", {
      p_attempt_id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
      p_cover_photo_id: null,
      p_description: "A sunny afternoon.",
      p_location: "The park",
      p_memory_date: "2020-08-20",
      p_timezone: "UTC",
      p_title: "Our picnic",
      p_visibility: "timeline",
    });
  });

  it("uploads the original, cover, and detail before finalizing a photo", async () => {
    const formData = createFormData();
    const bytes = photoFixtures.png;
    const photo = createPhoto("memory.png", bytes);
    formData.append("photos", photo);
    formData.set("coverPhotoIndex", "0");

    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            attempt_id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
            is_new: true,
            memory_id: null,
            status: "processing",
          },
        ],
        error: null,
      })
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
      .mockResolvedValueOnce({ data: "3ddf312a-e682-4cd8-91f9-9a2a230241ed", error: null });
    const upload = vi.fn().mockResolvedValue({ error: null });
    createAdminClientMock.mockReturnValue({
      rpc,
      storage: { from: vi.fn(() => ({ upload })) },
    });

    await expect(
      createMemory("member-id", "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0", formData),
    ).resolves.toEqual({ id: "3ddf312a-e682-4cd8-91f9-9a2a230241ed", reused: false });

    expect(upload).toHaveBeenNthCalledWith(1, "space/attempt/photo/original", bytes, {
      contentType: "image/png",
      upsert: false,
    });
    expect(upload).toHaveBeenNthCalledWith(
      2,
      "space/attempt/photo/cover.webp",
      Buffer.from("cover"),
      { contentType: "image/webp", upsert: false },
    );
    expect(upload).toHaveBeenNthCalledWith(
      3,
      "space/attempt/photo/detail.webp",
      Buffer.from("detail"),
      { contentType: "image/webp", upsert: false },
    );
    expect(rpc).toHaveBeenCalledWith("mark_memory_photo_uploaded", {
      p_photo_id: expect.any(String),
    });
  });
});
