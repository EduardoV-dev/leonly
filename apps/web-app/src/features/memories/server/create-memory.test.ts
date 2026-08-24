import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));

import { createMemory, validateCreateMemoryFormData } from "./create-memory";

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
    const createPng = (name: string) => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const file = new File([bytes], name, {
        type: "image/png",
      });
      Object.defineProperty(file, "arrayBuffer", {
        value: async () => bytes.buffer,
      });
      return file;
    };
    const validFormData = createFormData();
    for (let index = 0; index < 10; index += 1) {
      validFormData.append("photos", createPng(`${index}.png`));
    }
    validFormData.set("coverPhotoIndex", "0");

    await expect(validateCreateMemoryFormData(validFormData)).resolves.toMatchObject({
      coverPhotoIndex: 0,
      photos: expect.arrayContaining([expect.objectContaining({ contentType: "image/png" })]),
    });

    const invalidFormData = createFormData();
    for (let index = 0; index < 11; index += 1) {
      invalidFormData.append("photos", createPng(`${index}.png`));
    }
    invalidFormData.set("coverPhotoIndex", "0");

    await expect(validateCreateMemoryFormData(invalidFormData)).rejects.toMatchObject({
      fields: { photos: "Choose up to 10 photos." },
    });
  });
});

describe("createMemory", () => {
  beforeEach(() => vi.clearAllMocks());

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
});
