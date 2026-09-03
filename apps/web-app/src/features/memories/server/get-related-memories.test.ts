import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getRelatedMemories, getRelatedMemoriesForVisibility } from "./get-related-memories";

const getActiveSpaceMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());
const getCoverPreviewUrlMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/space-setup/server/get-active-space-for-user", () => ({
  getActiveSpaceForCurrentUser: getActiveSpaceMock,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({ logServerError: vi.fn() }));
vi.mock("./get-cover-preview-url", () => ({ getCoverPreviewUrl: getCoverPreviewUrlMock }));

const currentMemoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const relatedMemoryId = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";

function createQuery(data: unknown, error: unknown = null) {
  const query = {
    eq: vi.fn(),
    is: vi.fn(),
    limit: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
  };
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.neq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({ data, error });
  return query;
}

describe("getRelatedMemories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveSpaceMock.mockResolvedValue({ id: "561ecf16-cc9f-489c-ac1d-38fbfc35d97c" });
    getCoverPreviewUrlMock.mockResolvedValue("https://storage.example/related-cover");
  });

  it("loads the three newest eligible timeline memories except the open memory", async () => {
    const query = createQuery([
      {
        created_at: "2026-08-23T10:00:00.000Z",
        description: "A quiet afternoon together.",
        id: relatedMemoryId,
        location: "The botanical gardens",
        memory_date: "2026-08-20",
        memory_comments: [{ count: 2 }],
        title: "Among the flowers",
      },
    ]);
    createClientMock.mockResolvedValue({ from: vi.fn(() => ({ select: vi.fn(() => query) })) });

    await expect(getRelatedMemories(currentMemoryId)).resolves.toEqual([
      {
        commentCount: 2,
        coverPhotoUrl: "https://storage.example/related-cover",
        createdAt: "2026-08-23T10:00:00.000Z",
        description: "A quiet afternoon together.",
        id: relatedMemoryId,
        location: "The botanical gardens",
        memoryDate: "2026-08-20",
        title: "Among the flowers",
      },
    ]);

    expect(query.eq).toHaveBeenCalledWith("space_id", "561ecf16-cc9f-489c-ac1d-38fbfc35d97c");
    expect(query.eq).toHaveBeenCalledWith("visibility", "timeline");
    expect(query.neq).toHaveBeenCalledWith("id", currentMemoryId);
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
    expect(query.limit).toHaveBeenCalledWith(3);
    expect(getCoverPreviewUrlMock).toHaveBeenCalledWith(relatedMemoryId);
  });

  it("does not let a secondary read prevent the memory detail from rendering", async () => {
    const query = createQuery(null, new Error("database unavailable"));
    createClientMock.mockResolvedValue({ from: vi.fn(() => ({ select: vi.fn(() => query) })) });

    await expect(getRelatedMemories(currentMemoryId)).resolves.toEqual([]);
  });

  it("supports the same recommendation query for Vault memories", async () => {
    const query = createQuery([
      {
        created_at: "2026-08-23T10:00:00.000Z",
        description: null,
        id: relatedMemoryId,
        location: null,
        memory_date: "2026-08-20",
        memory_comments: [{ count: 0 }],
        title: "Another hidden moment",
      },
    ]);
    createClientMock.mockResolvedValue({ from: vi.fn(() => ({ select: vi.fn(() => query) })) });

    await expect(getRelatedMemoriesForVisibility(currentMemoryId, "vault")).resolves.toHaveLength(
      1,
    );
    expect(query.eq).toHaveBeenCalledWith("visibility", "vault");
  });
});
