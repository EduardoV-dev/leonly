import { beforeEach, describe, expect, it, vi } from "vitest";

const getAvailableMemoryMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("./get-available-memory", () => ({ getAvailableMemory: getAvailableMemoryMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("server-only", () => ({}));

import { commentCursor, getCommentPage } from "./get-comment-page";

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const spaceId = "b6d3c1f9-84a5-4e22-bf3e-09b94c9a1e33";
const authorId = "e951cd4b-7567-4b1e-a5d3-18aa810cbd8e";
const avatarUrl = "https://cdn.example.com/alex.jpg";

function authorRow() {
  return { display_name: "Alex", user_id: authorId, users: { avatar_url: avatarUrl } };
}

function createQuery(data: unknown[]) {
  const query = {
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
  };
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.or.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({ data, error: null });
  query.maybeSingle.mockResolvedValue({ data: null, error: null });
  return query;
}

function row(index: number, second = 0) {
  return {
    author_user_id: authorId,
    body: `Comment ${index}`,
    created_at: `2026-09-02T10:00:${String(30 - second).padStart(2, "0")}.000Z`,
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    memory_id: memoryId,
  };
}

describe("getCommentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAvailableMemoryMock.mockResolvedValue({ id: memoryId, spaceId });
  });

  it("reads at most 20 active comments in the full newest-first tuple order", async () => {
    const comments = Array.from({ length: 21 }, (_, index) => row(index));
    const commentQuery = createQuery(comments);
    const authorQuery = createQuery([authorRow()]);
    createClientMock.mockResolvedValue({
      from: vi
        .fn()
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(commentQuery) })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue(authorQuery),
        }),
    });

    const page = await getCommentPage(memoryId, null);

    expect(commentQuery.is).toHaveBeenCalledWith("deleted_at", null);
    expect(commentQuery.order).toHaveBeenNthCalledWith(1, "created_at", { ascending: false });
    expect(commentQuery.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(commentQuery.limit).toHaveBeenCalledWith(21);
    expect(page.comments).toHaveLength(20);
    expect(page.comments[0]?.authorAvatarUrl).toBe(avatarUrl);
    expect(page.comments[0]?.authorDisplayName).toBe("Alex");
    expect(commentCursor.decode(page.nextCursor ?? "")).toMatchObject({
      createdAt: comments[19]?.created_at,
      id: comments[19]?.id,
      memoryId,
      v: 1,
    });
  });

  it("applies the complete timestamp and UUID tuple after a valid cursor", async () => {
    const anchor = row(9);
    const cursor = commentCursor.encode({
      authorAvatarUrl: null,
      authorDisplayName: "Alex",
      body: anchor.body,
      createdAt: anchor.created_at,
      id: anchor.id,
      memoryId,
    });
    const anchorQuery = createQuery([]);
    anchorQuery.maybeSingle.mockResolvedValue({ data: { id: anchor.id }, error: null });
    const pageQuery = createQuery([]);
    const authorQuery = createQuery([]);
    createClientMock
      .mockResolvedValueOnce({ from: vi.fn(() => ({ select: vi.fn(() => anchorQuery) })) })
      .mockResolvedValueOnce({
        from: vi
          .fn()
          .mockReturnValueOnce({ select: vi.fn(() => pageQuery) })
          .mockReturnValueOnce({
            select: vi.fn(() => authorQuery),
          }),
      });

    await getCommentPage(memoryId, cursor);

    expect(pageQuery.or).toHaveBeenCalledWith(
      expect.stringContaining(`created_at.eq.${anchor.created_at}`),
    );
    expect(pageQuery.or).toHaveBeenCalledWith(expect.stringContaining(`id.lt.${anchor.id}`));
  });

  it("continues a tied-timestamp page after the UUID without repeating the anchor", async () => {
    const anchor = row(9);
    const next = { ...row(8), created_at: anchor.created_at };
    const cursor = commentCursor.encode({
      authorAvatarUrl: null,
      authorDisplayName: "Alex",
      body: anchor.body,
      createdAt: anchor.created_at,
      id: anchor.id,
      memoryId,
    });
    const anchorQuery = createQuery([]);
    anchorQuery.maybeSingle.mockResolvedValue({ data: { id: anchor.id }, error: null });
    const pageQuery = createQuery([next]);
    const authorQuery = createQuery([authorRow()]);
    createClientMock
      .mockResolvedValueOnce({ from: vi.fn(() => ({ select: vi.fn(() => anchorQuery) })) })
      .mockResolvedValueOnce({
        from: vi
          .fn()
          .mockReturnValueOnce({ select: vi.fn(() => pageQuery) })
          .mockReturnValueOnce({
            select: vi.fn(() => authorQuery),
          }),
      });

    await expect(getCommentPage(memoryId, cursor)).resolves.toMatchObject({
      comments: [{ id: next.id }],
      nextCursor: null,
    });
    expect(pageQuery.or).toHaveBeenCalledWith(
      `created_at.lt.${anchor.created_at},and(created_at.eq.${anchor.created_at},id.lt.${anchor.id})`,
    );
  });

  it("resets malformed and cross-memory cursors without using them as predicates", async () => {
    const query = createQuery([]);
    const authorQuery = createQuery([]);
    createClientMock.mockResolvedValue({
      from: vi
        .fn()
        .mockReturnValueOnce({ select: vi.fn(() => query) })
        .mockReturnValueOnce({
          select: vi.fn(() => authorQuery),
        }),
    });

    await expect(getCommentPage(memoryId, "invalid-cursor")).resolves.toMatchObject({
      comments: [],
      cursorReset: true,
    });
    expect(query.or).not.toHaveBeenCalled();

    const crossMemoryCursor = commentCursor.encode({
      authorAvatarUrl: null,
      authorDisplayName: "Alex",
      body: "Foreign",
      createdAt: "2026-09-02T10:00:00.000Z",
      id: "561ecf16-cc9f-489c-ac1d-38fbfc35d97c",
      memoryId: "3ddf312a-e682-4cd8-91f9-9a2a230241ed",
    });
    const crossQuery = createQuery([]);
    const crossAuthors = createQuery([]);
    createClientMock.mockResolvedValue({
      from: vi
        .fn()
        .mockReturnValueOnce({ select: vi.fn(() => crossQuery) })
        .mockReturnValueOnce({
          select: vi.fn(() => crossAuthors),
        }),
    });

    await expect(getCommentPage(memoryId, crossMemoryCursor)).resolves.toMatchObject({
      comments: [],
      cursorReset: true,
    });
    expect(crossQuery.or).not.toHaveBeenCalled();
  });

  it("replaces the page after a stale active anchor instead of skipping records", async () => {
    const anchor = row(4);
    const cursor = commentCursor.encode({
      authorAvatarUrl: null,
      authorDisplayName: "Alex",
      body: anchor.body,
      createdAt: anchor.created_at,
      id: anchor.id,
      memoryId,
    });
    const anchorQuery = createQuery([]);
    anchorQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    const firstPageQuery = createQuery([row(1)]);
    const authorQuery = createQuery([authorRow()]);
    createClientMock
      .mockResolvedValueOnce({ from: vi.fn(() => ({ select: vi.fn(() => anchorQuery) })) })
      .mockResolvedValueOnce({
        from: vi
          .fn()
          .mockReturnValueOnce({ select: vi.fn(() => firstPageQuery) })
          .mockReturnValueOnce({
            select: vi.fn(() => authorQuery),
          }),
      });

    await expect(getCommentPage(memoryId, cursor)).resolves.toMatchObject({
      comments: [{ id: row(1).id }],
      cursorReset: true,
    });
    expect(firstPageQuery.or).not.toHaveBeenCalled();
  });

  it("returns no cursor on the final page and never fabricates an author", async () => {
    const commentQuery = createQuery([row(1), row(2)]);
    const authorQuery = createQuery([authorRow()]);
    createClientMock.mockResolvedValue({
      from: vi
        .fn()
        .mockReturnValueOnce({ select: vi.fn(() => commentQuery) })
        .mockReturnValueOnce({
          select: vi.fn(() => authorQuery),
        }),
    });

    await expect(getCommentPage(memoryId, null)).resolves.toMatchObject({ nextCursor: null });
  });
});
