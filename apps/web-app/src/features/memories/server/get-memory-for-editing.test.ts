import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createClientMock, getAvailableMemoryMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getAvailableMemoryMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("./get-available-memory", () => ({ getAvailableMemory: getAvailableMemoryMock }));

import { getMemoryForEditing } from "./get-memory-for-editing";
import { decodeMemoryVersion } from "./memory-version";

const memory = {
  coverPhotoId: "64d44f34-c5fe-482a-b65b-f91d0173b7fe",
  description: null,
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  location: null,
  memoryDate: "2026-08-20",
  title: "Among the flowers",
  updatedAt: "2026-08-23T10:00:00.000Z",
  visibility: "vault" as const,
};

function client(photoRows: unknown[] = []) {
  const query = {
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue({ data: photoRows, error: null }),
  };
  query.eq.mockReturnValue(query);
  return {
    from: vi.fn(() => ({ select: vi.fn(() => query) })),
  };
}

describe("getMemoryForEditing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAvailableMemoryMock.mockResolvedValue(memory);
  });

  it.each(["malformed", "missing", "inactive", "other-space", "deleted"])(
    "returns the same unavailable result for a %s memory",
    async () => {
      getAvailableMemoryMock.mockResolvedValue(null);
      await expect(getMemoryForEditing("not-disclosed")).resolves.toBeNull();
      expect(createClientMock).not.toHaveBeenCalled();
    },
  );

  it("returns placement-neutral editable state with persisted order and opaque version", async () => {
    createClientMock.mockResolvedValue(
      client([
        {
          detail_object_path: "space/first/detail.webp",
          id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
          object_path: "space/first/original",
          position: 0,
        },
        {
          detail_object_path: null,
          id: memory.coverPhotoId,
          object_path: "space/second/original",
          position: 1,
        },
      ]),
    );

    const result = await getMemoryForEditing(memory.id);

    expect(result?.initialVisibility).toBe("vault");
    expect(result?.photos.map((photo) => photo.id)).toEqual([
      "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
      memory.coverPhotoId,
    ]);
    expect(result?.version).not.toContain(memory.updatedAt);
    expect(decodeMemoryVersion(result?.version ?? "")).toBe(memory.updatedAt);
    expect(result?.photos).toEqual([
      {
        id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
        previewUrl: `/api/memories/${memory.id}/photos/2505a6a1-0d34-48f7-8d0d-e7cf9a62e452/detail`,
      },
      {
        id: memory.coverPhotoId,
        previewUrl: `/api/memories/${memory.id}/photos/${memory.coverPhotoId}/detail`,
      },
    ]);
    expect(JSON.stringify(result?.photos)).not.toContain("space/");
  });
});
