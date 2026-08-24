import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTimelinePage, timelineCursor } from "./get-timeline-page";

const getActiveSpaceMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());
const getCoverPreviewUrlMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/space-setup/server/get-active-space-for-user", () => ({
  getActiveSpaceForCurrentUser: getActiveSpaceMock,
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

vi.mock("./get-cover-preview-url", () => ({ getCoverPreviewUrl: getCoverPreviewUrlMock }));

const rows = Array.from({ length: 21 }, (_, index) => ({
  cover: [],
  created_at: `2026-08-23T10:00:${String(20 - index).padStart(2, "0")}.000Z`,
  description: index === 0 ? "A good day" : null,
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  location: null,
  memory_date: "2026-08-23",
  title: `Memory ${index}`,
}));

function createQuery(data = rows) {
  const query = {
    eq: vi.fn(),
    is: vi.fn(),
    limit: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
  };
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.or.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({ data, error: null });
  return query;
}

describe("getTimelinePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveSpaceMock.mockResolvedValue({ id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0" });
    getCoverPreviewUrlMock.mockResolvedValue(null);
  });

  it("uses the authorized active space, eligibility filters, full order, and a 20-item boundary", async () => {
    const query = createQuery();
    createClientMock.mockResolvedValue({ from: vi.fn(() => ({ select: vi.fn(() => query) })) });
    getCoverPreviewUrlMock.mockResolvedValue("https://storage.example/signed-cover");

    const page = await getTimelinePage(null);

    expect(query.eq).toHaveBeenCalledWith("space_id", "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0");
    expect(query.eq).toHaveBeenCalledWith("visibility", "timeline");
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
    expect(query.order).toHaveBeenNthCalledWith(1, "memory_date", { ascending: false });
    expect(query.order).toHaveBeenNthCalledWith(2, "created_at", { ascending: false });
    expect(query.order).toHaveBeenNthCalledWith(3, "id", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(21);
    expect(page.memories).toHaveLength(20);
    expect(page.memories[0]?.coverPhotoUrl).toBe("https://storage.example/signed-cover");
    expect(getCoverPreviewUrlMock).toHaveBeenCalledWith(rows[0]?.id);
    expect(page.nextCursor).not.toBeNull();
    if (!page.nextCursor) {
      throw new Error("Expected a next-page cursor.");
    }
    expect(timelineCursor.decode(page.nextCursor)).toMatchObject({ id: rows[19].id, v: 1 });
  });

  it("resets malformed cursors without using them as a query predicate", async () => {
    const query = createQuery([]);
    createClientMock.mockResolvedValue({ from: vi.fn(() => ({ select: vi.fn(() => query) })) });

    await expect(getTimelinePage("not-a-cursor")).resolves.toMatchObject({
      cursorReset: true,
      memories: [],
    });
    expect(query.or).not.toHaveBeenCalled();
  });

  it("resets a stale cursor anchor without continuing from its tuple", async () => {
    const anchorQuery = {
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    anchorQuery.eq.mockReturnValue(anchorQuery);
    anchorQuery.is.mockReturnValue(anchorQuery);
    const firstPageQuery = createQuery([]);
    createClientMock
      .mockResolvedValueOnce({ from: vi.fn(() => ({ select: vi.fn(() => anchorQuery) })) })
      .mockResolvedValueOnce({ from: vi.fn(() => ({ select: vi.fn(() => firstPageQuery) })) });
    const cursor = timelineCursor.encode({
      createdAt: "2026-08-23T10:00:00.000Z",
      description: null,
      id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
      coverPhotoUrl: null,
      location: null,
      memoryDate: "2026-08-23",
      title: "Anchor",
    });

    await expect(getTimelinePage(cursor)).resolves.toMatchObject({
      cursorReset: true,
      memories: [],
    });
    expect(firstPageQuery.or).not.toHaveBeenCalled();
  });
});
