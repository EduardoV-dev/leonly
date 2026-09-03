import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createAdminClientMock, createClientMock, downloadMock, getAvailableMemoryMock } =
  vi.hoisted(() => ({
    createAdminClientMock: vi.fn(),
    createClientMock: vi.fn(),
    downloadMock: vi.fn(),
    getAvailableMemoryMock: vi.fn(),
  }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("./get-available-memory", () => ({ getAvailableMemory: getAvailableMemoryMock }));

import { getMemoryPhoto } from "./get-memory-photo";

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const photoId = "22a6c4ed-10c7-42a9-a7a8-b31d210ea2bf";
const bytes = new Uint8Array([82, 73, 70, 70]).buffer;

function createPhotoQuery(photo: unknown) {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: photo, error: null }),
  };
  query.eq.mockReturnValue(query);
  return query;
}

describe("getMemoryPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAvailableMemoryMock.mockResolvedValue({ id: memoryId });
    const query = createPhotoQuery({
      cover_object_path: "private/cover.webp",
      detail_object_path: "private/detail.webp",
      object_path: "private/original.jpg",
    });
    createClientMock.mockResolvedValue({
      from: vi.fn(() => ({ select: vi.fn(() => query) })),
    });
    downloadMock.mockResolvedValue({
      data: { arrayBuffer: vi.fn().mockResolvedValue(bytes) },
      error: null,
    });
    createAdminClientMock.mockReturnValue({
      storage: { from: vi.fn(() => ({ download: downloadMock })) },
    });
  });

  it.each([
    ["cover", "private/cover.webp"],
    ["detail", "private/detail.webp"],
  ] as const)("downloads the server-owned %s variant", async (variant, objectPath) => {
    await expect(getMemoryPhoto(memoryId, photoId, variant)).resolves.toEqual(bytes);

    expect(getAvailableMemoryMock).toHaveBeenCalledWith(memoryId);
    expect(downloadMock).toHaveBeenCalledWith(objectPath);
  });

  it("matches the photo to its authorized parent before downloading", async () => {
    const query = createPhotoQuery(null);
    createClientMock.mockResolvedValue({
      from: vi.fn(() => ({ select: vi.fn(() => query) })),
    });

    await expect(getMemoryPhoto(memoryId, photoId, "cover")).resolves.toBeNull();
    expect(query.eq).toHaveBeenCalledWith("id", photoId);
    expect(query.eq).toHaveBeenCalledWith("memory_id", memoryId);
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it.each(["missing", "inactive", "deleted", "cross-space", "foreign"])(
    "returns unavailable without metadata or bytes for a %s parent",
    async () => {
      getAvailableMemoryMock.mockResolvedValue(null);

      await expect(getMemoryPhoto(memoryId, photoId, "detail")).resolves.toBeNull();
      expect(createClientMock).not.toHaveBeenCalled();
      expect(downloadMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["invalid-memory", photoId, "cover"],
    [memoryId, "invalid-photo", "cover"],
    [memoryId, photoId, "original"],
  ])("rejects malformed or non-allowlisted identifiers", async (memory, photo, variant) => {
    await expect(getMemoryPhoto(memory, photo, variant)).resolves.toBeNull();
    expect(getAvailableMemoryMock).not.toHaveBeenCalled();
  });

  it("returns unavailable when the object download fails", async () => {
    downloadMock.mockResolvedValue({ data: null, error: new Error("object unavailable") });

    await expect(getMemoryPhoto(memoryId, photoId, "detail")).resolves.toBeNull();
  });

  it("reauthorizes a previously rendered URL after its parent is deleted", async () => {
    await expect(getMemoryPhoto(memoryId, photoId, "cover")).resolves.toEqual(bytes);
    getAvailableMemoryMock.mockResolvedValue(null);

    await expect(getMemoryPhoto(memoryId, photoId, "cover")).resolves.toBeNull();
    expect(getAvailableMemoryMock).toHaveBeenCalledTimes(2);
    expect(downloadMock).toHaveBeenCalledOnce();
  });
});
