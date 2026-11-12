import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: "session=abc" }) }));

const serverApiGet = vi.fn();

vi.mock("@/lib/axios/server-api", () => ({
  serverApi: { get: (...args: unknown[]) => serverApiGet(...args) },
}));

import { getMemoryForEditing } from "./get-memory-for-editing";

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const photoId = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";
const updatedAt = "2026-09-05T16:00:00.123000Z";

const snapshot = {
  coverFileId: photoId,
  description: null,
  id: memoryId,
  location: null,
  memoryDate: "2026-08-20",
  photos: [
    { id: photoId, previewUrl: "https://signed/detail" },
    { id: "9a2b1c3d-0d34-48f7-8d0d-e7cf9a62e453", previewUrl: null },
  ],
  title: "Among the flowers",
  updatedAt,
  visibility: "vault" as const,
};

function okResponse(data: unknown, status = 200) {
  return { status, data: { ok: true, data, error: [], message: "ok" } };
}

describe("getMemoryForEditing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the placement-neutral snapshot with the exact timestamp and nullable previews", async () => {
    serverApiGet.mockResolvedValue(okResponse(snapshot));

    const result = await getMemoryForEditing(memoryId);

    expect(result).toEqual({
      coverPhotoId: photoId,
      description: null,
      id: memoryId,
      initialVisibility: "vault",
      location: null,
      memoryDate: "2026-08-20",
      photos: snapshot.photos,
      title: "Among the flowers",
      version: updatedAt,
    });
    expect(serverApiGet).toHaveBeenCalledWith(
      `/memories/${memoryId}/edit`,
      expect.objectContaining({ headers: { cookie: "session=abc" } }),
    );
    expect(JSON.stringify(result)).not.toContain("objectKey");
  });

  it.each(["malformed", "missing", "inactive", "other-space", "deleted"])(
    "returns the same unavailable result for a %s memory",
    async (kind) => {
      if (kind === "malformed") {
        await expect(getMemoryForEditing("not-a-uuid")).resolves.toBeNull();
      } else {
        serverApiGet.mockResolvedValue({ status: 404, data: { ok: false, data: null } });
        await expect(getMemoryForEditing(memoryId)).resolves.toBeNull();
      }
      if (kind !== "malformed") {
        expect(serverApiGet).toHaveBeenCalledTimes(1);
      }
    },
  );

  it("rejects malformed snapshot payloads as a retryable read failure", async () => {
    serverApiGet.mockResolvedValue(okResponse({ ...snapshot, updatedAt: 123 }));

    await expect(getMemoryForEditing(memoryId)).rejects.toThrow("Failed to load memory editor.");
  });
});
