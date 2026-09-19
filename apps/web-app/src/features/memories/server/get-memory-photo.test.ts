import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createClientMock, downloadMock, fromMock, getAvailableMemoryMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  downloadMock: vi.fn(),
  fromMock: vi.fn(),
  getAvailableMemoryMock: vi.fn(),
}));

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
    getAvailableMemoryMock.mockResolvedValue({
      id: memoryId,
      spaceId: "561ecf16-cc9f-489c-ac1d-38fbfc35d97c",
    });
    const query = createPhotoQuery({
      object_path: "private/derived.webp",
    });
    fromMock.mockReturnValue({ select: vi.fn(() => query) });
    createClientMock.mockResolvedValue({
      from: fromMock,
      storage: { from: vi.fn(() => ({ download: downloadMock })) },
    });
    downloadMock.mockResolvedValue({
      data: { arrayBuffer: vi.fn().mockResolvedValue(bytes) },
      error: null,
    });
  });

  it.each(["cover", "detail"] as const)("downloads the ready %s variant", async (variant) => {
    await expect(getMemoryPhoto(memoryId, photoId, variant)).resolves.toEqual(bytes);

    expect(getAvailableMemoryMock).toHaveBeenCalledWith(memoryId);
    expect(fromMock).toHaveBeenCalledWith("memory_asset_objects");
    expect(downloadMock).toHaveBeenCalledWith("private/derived.webp");
  });

  it("matches the asset to its authorized memory and space before downloading", async () => {
    const query = createPhotoQuery(null);
    createClientMock.mockResolvedValue({
      from: vi.fn(() => ({ select: vi.fn(() => query) })),
      storage: { from: vi.fn(() => ({ download: downloadMock })) },
    });

    await expect(getMemoryPhoto(memoryId, photoId, "cover")).resolves.toBeNull();
    expect(query.eq).toHaveBeenCalledWith("asset_id", photoId);
    expect(query.eq).toHaveBeenCalledWith("memory_assets.memory_id", memoryId);
    expect(query.eq).toHaveBeenCalledWith(
      "memory_assets.space_id",
      "561ecf16-cc9f-489c-ac1d-38fbfc35d97c",
    );
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it("rejects objects that are not the requested ready derived variant", async () => {
    const query = createPhotoQuery(null);
    createClientMock.mockResolvedValue({
      from: vi.fn(() => ({ select: vi.fn(() => query) })),
      storage: { from: vi.fn(() => ({ download: downloadMock })) },
    });

    await expect(getMemoryPhoto(memoryId, photoId, "detail")).resolves.toBeNull();
    expect(query.eq).toHaveBeenCalledWith("variant_type", "detail");
    expect(query.eq).toHaveBeenCalledWith("status", "ready");
    expect(downloadMock).not.toHaveBeenCalled();
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
