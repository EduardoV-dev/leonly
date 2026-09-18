import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createAdminClientMock,
  createClientMock,
  createGrantMock,
  deriveMemoryIdMock,
  validatePhotoMock,
  verifyGrantMock,
} = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  createClientMock: vi.fn(),
  createGrantMock: vi.fn((_payload: { assets: unknown[] }) => "signed-grant"),
  deriveMemoryIdMock: vi.fn(() => "64d44f34-c5fe-482a-b65b-f91d0173b7fe"),
  validatePhotoMock: vi.fn(),
  verifyGrantMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("./memory-upload-grant", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./memory-upload-grant")>()),
  createMemoryUploadGrant: createGrantMock,
  deriveMemoryId: deriveMemoryIdMock,
  verifyMemoryUploadGrant: verifyGrantMock,
}));
vi.mock("./memory-input-validation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./memory-input-validation")>()),
  validateMemoryPhotoBytes: validatePhotoMock,
}));

import { createMemory, prepareMemoryCreation, validateCreateMemoryFormData } from "./create-memory";

const ACTOR_ID = "authenticated-user";
const MEMORY_ID = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";
const MUTATION_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const PHOTO_ID = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";
const SPACE_ID = "561ecf16-cc9f-489c-ac1d-38fbfc35d97c";

function formData(withPhoto = false): FormData {
  const value = new FormData();
  value.set("title", "  Our picnic  ");
  value.set("description", "  A sunny afternoon.  ");
  value.set("location", "  The park  ");
  value.set("memoryDate", "2020-08-20");
  value.set("timezone", "UTC");
  value.set("visibility", "timeline");
  value.set("mutationId", MUTATION_ID);
  if (withPhoto) {
    value.append("photoIds", PHOTO_ID);
    value.append("photoNames", "memory.png");
    value.set("coverPhotoId", PHOTO_ID);
  }
  return value;
}

function grantPayload() {
  const basePath = `${SPACE_ID}/memories/${MEMORY_ID}/${PHOTO_ID}`;
  return {
    actorId: ACTOR_ID,
    assets: [
      {
        coverPath: `${basePath}/cover.webp`,
        detailPath: `${basePath}/detail.webp`,
        id: PHOTO_ID,
        isCover: true,
        name: "memory.png",
        originalPath: `${basePath}/original`,
        position: 0,
        temporaryPath: `${SPACE_ID}/temporary/${MUTATION_ID}/${PHOTO_ID}/original`,
      },
    ],
    description: "A sunny afternoon.",
    expiresAt: 1,
    issuedAt: 1,
    location: "The park",
    memoryDate: "2020-08-20",
    memoryId: MEMORY_ID,
    mutationId: MUTATION_ID,
    operation: "create" as const,
    spaceId: SPACE_ID,
    timezone: "UTC",
    title: "Our picnic",
    visibility: "timeline" as const,
  };
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
});

describe("stateless memory creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: { id: SPACE_ID }, error: null }),
    });
  });

  it("validates the full form and returns signed upload path/token data", async () => {
    const createSignedUploadUrl = vi.fn().mockResolvedValue({
      data: { path: "ignored", token: "upload-token" },
      error: null,
    });
    createAdminClientMock.mockReturnValue({
      storage: { from: vi.fn(() => ({ createSignedUploadUrl })) },
    });

    await expect(prepareMemoryCreation(formData(true), ACTOR_ID)).resolves.toEqual({
      grant: "signed-grant",
      uploads: [
        {
          id: PHOTO_ID,
          path: `${SPACE_ID}/temporary/${MUTATION_ID}/${PHOTO_ID}/original`,
          token: "upload-token",
        },
      ],
    });
    expect(deriveMemoryIdMock).toHaveBeenCalledWith(ACTOR_ID, SPACE_ID, MUTATION_ID);
    expect(createSignedUploadUrl).toHaveBeenCalledWith(
      `${SPACE_ID}/temporary/${MUTATION_ID}/${PHOTO_ID}/original`,
      { upsert: true },
    );
    expect(createGrantMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: ACTOR_ID, memoryId: MEMORY_ID, mutationId: MUTATION_ID }),
    );
    expect(createGrantMock.mock.calls[0]?.[0].assets[0]).toMatchObject({
      originalPath: `${SPACE_ID}/memories/${MEMORY_ID}/${PHOTO_ID}/original`,
      temporaryPath: `${SPACE_ID}/temporary/${MUTATION_ID}/${PHOTO_ID}/original`,
    });
  });

  it("rejects an invalid full form before resolving storage authorization", async () => {
    const invalid = formData(true);
    invalid.set("title", "");

    await expect(prepareMemoryCreation(invalid, ACTOR_ID)).rejects.toMatchObject({
      fields: { title: "Required." },
    });
    expect(createClientMock).not.toHaveBeenCalled();
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("downloads and validates originals, stores variants, and retries the same mutation", async () => {
    const payload = grantPayload();
    verifyGrantMock.mockReturnValue(payload);
    validatePhotoMock.mockResolvedValue({
      contentType: "image/png",
      variants: { cover: Buffer.from("cover"), detail: Buffer.from("detail") },
    });
    const download = vi.fn().mockResolvedValue({
      data: { arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode("original").buffer) },
      error: null,
    });
    const upload = vi.fn().mockResolvedValue({ error: null });
    createAdminClientMock.mockReturnValue({
      storage: { from: vi.fn(() => ({ download, upload })) },
    });
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: { memory_id: null, status: "pending", visibility: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { memory_id: MEMORY_ID, status: "completed", visibility: "timeline" },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { memory_id: MEMORY_ID, status: "completed", visibility: "timeline" },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });
    createAdminClientMock.mockReturnValue({
      rpc,
      storage: { from: vi.fn(() => ({ download, upload })) },
    });

    await expect(createMemory("signed-grant", ACTOR_ID)).resolves.toEqual({
      id: MEMORY_ID,
      visibility: "timeline",
    });
    await expect(createMemory("signed-grant", ACTOR_ID)).resolves.toEqual({
      id: MEMORY_ID,
      visibility: "timeline",
    });

    expect(verifyGrantMock).toHaveBeenCalledWith("signed-grant", ACTOR_ID);
    expect(download).toHaveBeenCalledOnce();
    expect(download).toHaveBeenCalledWith(payload.assets[0].temporaryPath);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(createClientMock).not.toHaveBeenCalled();
    expect(upload).toHaveBeenCalledWith(payload.assets[0].originalPath, Buffer.from("original"), {
      contentType: "image/png",
      upsert: false,
    });
    expect(rpc).toHaveBeenCalledTimes(5);
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "get_memory_creation_result",
      expect.objectContaining({
        p_actor_subject: ACTOR_ID,
        p_memory_id: MEMORY_ID,
        p_mutation_id: MUTATION_ID,
        p_space_id: SPACE_ID,
      }),
    );
    expect(rpc).toHaveBeenCalledWith(
      "finalize_memory_creation",
      expect.objectContaining({
        p_actor_subject: ACTOR_ID,
        p_memory_id: MEMORY_ID,
        p_mutation_id: MUTATION_ID,
        p_space_id: SPACE_ID,
      }),
    );
    expect(rpc).toHaveBeenLastCalledWith("enqueue_memory_creation_cleanup", {
      p_actor_subject: ACTOR_ID,
      p_memory_id: MEMORY_ID,
      p_mutation_id: MUTATION_ID,
      p_paths: [payload.assets[0].temporaryPath],
    });
  });

  it("enqueues bounded cleanup when an original cannot be finalized", async () => {
    const payload = grantPayload();
    verifyGrantMock.mockReturnValue(payload);
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: { memory_id: null, status: "pending", visibility: null },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });
    createAdminClientMock.mockReturnValue({
      rpc,
      storage: {
        from: vi.fn(() => ({
          download: vi.fn().mockResolvedValue({ data: null, error: new Error("missing") }),
        })),
      },
    });

    await expect(createMemory("signed-grant", ACTOR_ID)).rejects.toThrow(
      "Unable to download a memory original.",
    );
    expect(rpc).toHaveBeenCalledWith("enqueue_memory_creation_cleanup", {
      p_actor_subject: ACTOR_ID,
      p_memory_id: MEMORY_ID,
      p_mutation_id: MUTATION_ID,
      p_paths: [
        payload.assets[0].temporaryPath,
        payload.assets[0].originalPath,
        payload.assets[0].coverPath,
        payload.assets[0].detailPath,
      ],
    });
  });

  it.each([
    ["RPC error", { data: null, error: new Error("database unavailable") }],
    ["malformed response", { data: { status: "unexpected" }, error: null }],
  ])("enqueues cleanup after a finalization %s", async (_case, finalization) => {
    const payload = grantPayload();
    verifyGrantMock.mockReturnValue(payload);
    validatePhotoMock.mockResolvedValue({
      contentType: "image/png",
      variants: { cover: Buffer.from("cover"), detail: Buffer.from("detail") },
    });
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: { memory_id: null, status: "pending", visibility: null },
        error: null,
      })
      .mockResolvedValueOnce(finalization)
      .mockResolvedValueOnce({ data: null, error: null });
    createAdminClientMock.mockReturnValue({
      rpc,
      storage: {
        from: vi.fn(() => ({
          download: vi.fn().mockResolvedValue({
            data: {
              arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode("original").buffer),
            },
            error: null,
          }),
          upload: vi.fn().mockResolvedValue({ error: null }),
        })),
      },
    });

    await expect(createMemory("signed-grant", ACTOR_ID)).rejects.toThrow();
    expect(rpc).toHaveBeenLastCalledWith("enqueue_memory_creation_cleanup", {
      p_actor_subject: ACTOR_ID,
      p_memory_id: MEMORY_ID,
      p_mutation_id: MUTATION_ID,
      p_paths: [
        payload.assets[0].temporaryPath,
        payload.assets[0].originalPath,
        payload.assets[0].coverPath,
        payload.assets[0].detailPath,
      ],
    });
  });

  it("rejects a permanent object that contains different bytes", async () => {
    const payload = grantPayload();
    verifyGrantMock.mockReturnValue(payload);
    validatePhotoMock.mockResolvedValue({
      contentType: "image/png",
      variants: { cover: Buffer.from("cover"), detail: Buffer.from("detail") },
    });
    const download = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode("original").buffer),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode("different").buffer),
        },
        error: null,
      });
    const upload = vi.fn().mockResolvedValue({ error: new Error("already exists") });
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: { memory_id: null, status: "pending", visibility: null },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });
    createAdminClientMock.mockReturnValue({
      rpc,
      storage: { from: vi.fn(() => ({ download, upload })) },
    });

    await expect(createMemory("signed-grant", ACTOR_ID)).rejects.toThrow("different bytes");
    expect(upload).toHaveBeenCalledOnce();
    expect(rpc).not.toHaveBeenCalledWith("finalize_memory_creation", expect.anything());
  });

  it("accepts an existing permanent object only when its bytes are identical", async () => {
    const payload = grantPayload();
    verifyGrantMock.mockReturnValue(payload);
    validatePhotoMock.mockResolvedValue({
      contentType: "image/png",
      variants: { cover: Buffer.from("cover"), detail: Buffer.from("detail") },
    });
    const original = new TextEncoder().encode("original").buffer;
    const download = vi
      .fn()
      .mockResolvedValueOnce({
        data: { arrayBuffer: vi.fn().mockResolvedValue(original) },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { arrayBuffer: vi.fn().mockResolvedValue(original) },
        error: null,
      });
    const upload = vi
      .fn()
      .mockResolvedValueOnce({ error: new Error("already exists") })
      .mockResolvedValue({ error: null });
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: { memory_id: null, status: "pending", visibility: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { memory_id: MEMORY_ID, status: "completed", visibility: "timeline" },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });
    createAdminClientMock.mockReturnValue({
      rpc,
      storage: { from: vi.fn(() => ({ download, upload })) },
    });

    await expect(createMemory("signed-grant", ACTOR_ID)).resolves.toMatchObject({ id: MEMORY_ID });
    expect(download).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenCalledWith("finalize_memory_creation", expect.anything());
  });
});
