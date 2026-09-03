import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getCoverPreviewUrl } from "./get-cover-preview-url";

const getAvailableMemoryMock = vi.hoisted(() => vi.fn());

vi.mock("./get-available-memory", () => ({ getAvailableMemory: getAvailableMemoryMock }));

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const coverPhotoId = "22a6c4ed-10c7-42a9-a7a8-b31d210ea2bf";

describe("getCoverPreviewUrl", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only an opaque same-origin route after available-memory authorization", async () => {
    getAvailableMemoryMock.mockResolvedValue({ coverPhotoId, id: memoryId });

    const result = await getCoverPreviewUrl(memoryId);

    expect(result).toBe(`/api/memories/${memoryId}/photos/${coverPhotoId}/cover`);
    expect(result).not.toContain("storage");
    expect(result).not.toContain("token");
    expect(getAvailableMemoryMock).toHaveBeenCalledWith(memoryId);
  });

  it.each(["missing", "inactive", "deleted", "other-space", "unauthorized"])(
    "returns no URL for a %s memory",
    async () => {
      getAvailableMemoryMock.mockResolvedValue(null);

      await expect(getCoverPreviewUrl(memoryId)).resolves.toBeNull();
    },
  );

  it("returns no URL without authorizing malformed identifiers", async () => {
    await expect(getCoverPreviewUrl("not-a-uuid")).resolves.toBeNull();
    expect(getAvailableMemoryMock).not.toHaveBeenCalled();
  });

  it("returns no URL when the available memory has no cover", async () => {
    getAvailableMemoryMock.mockResolvedValue({ coverPhotoId: null, id: memoryId });

    await expect(getCoverPreviewUrl(memoryId)).resolves.toBeNull();
  });
});
