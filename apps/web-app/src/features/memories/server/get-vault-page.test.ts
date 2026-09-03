import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVaultPage, vaultCursor } from "./get-vault-page";

const getActiveSpaceMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());
const getCoverPreviewUrlMock = vi.hoisted(() => vi.fn());
const getMemoryReactionSummaryMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/space-setup/server/get-active-space-for-user", () => ({
  getActiveSpaceForCurrentUser: getActiveSpaceMock,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("./get-cover-preview-url", () => ({ getCoverPreviewUrl: getCoverPreviewUrlMock }));
vi.mock("./memory-reactions", () => ({ getMemoryReactionSummary: getMemoryReactionSummaryMock }));
vi.mock("server-only", () => ({}));

const rows = Array.from({ length: 21 }, (_, index) => ({
  created_at: `2026-08-23T10:00:${String(20 - index).padStart(2, "0")}.000Z`,
  description: index === 0 ? "A hidden chapter" : null,
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  location: index === 0 ? "The coast" : null,
  memory_date: "2026-08-23",
  memory_comments: [{ count: index }],
  title: `Vault memory ${index}`,
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

describe("getVaultPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveSpaceMock.mockResolvedValue({ id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0" });
    getCoverPreviewUrlMock.mockResolvedValue(null);
    getMemoryReactionSummaryMock.mockResolvedValue({
      counts: { cry: 0, heart: 0, laugh: 0, star: 0 },
      currentReaction: null,
    });
  });

  it("uses fixed Vault eligibility, full ordering, private covers, and a 20-item boundary", async () => {
    const query = createQuery();
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-id" } } }) },
      from: vi.fn(() => ({ select: vi.fn(() => query) })),
    });
    getCoverPreviewUrlMock.mockResolvedValue("https://storage.example/vault-cover");

    const page = await getVaultPage(null);

    expect(query.eq).toHaveBeenCalledWith("space_id", "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0");
    expect(query.eq).toHaveBeenCalledWith("visibility", "vault");
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
    expect(query.order).toHaveBeenNthCalledWith(1, "memory_date", { ascending: false });
    expect(query.order).toHaveBeenNthCalledWith(2, "created_at", { ascending: false });
    expect(query.order).toHaveBeenNthCalledWith(3, "id", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(21);
    expect(page.memories).toHaveLength(20);
    expect(page.memories[0]?.coverPhotoUrl).toBe("https://storage.example/vault-cover");
    expect(page.memories[0]?.commentCount).toBe(0);
    expect(getCoverPreviewUrlMock).toHaveBeenCalledWith(rows[0]?.id);
    expect(vaultCursor.decode(page.nextCursor ?? "")).toMatchObject({ id: rows[19]?.id, v: 1 });
  });

  it("applies the complete tuple when loading the next page", async () => {
    const anchorQuery = {
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: rows[0]?.id }, error: null }),
    };
    anchorQuery.eq.mockReturnValue(anchorQuery);
    anchorQuery.is.mockReturnValue(anchorQuery);
    const pageQuery = createQuery([]);
    createClientMock
      .mockResolvedValueOnce({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-id" } } }) },
      })
      .mockResolvedValueOnce({ from: vi.fn(() => ({ select: vi.fn(() => anchorQuery) })) })
      .mockResolvedValueOnce({ from: vi.fn(() => ({ select: vi.fn(() => pageQuery) })) });
    const cursor = vaultCursor.encode({
      coverPhotoUrl: null,
      commentCount: 0,
      createdAt: rows[0]?.created_at ?? "",
      description: null,
      id: rows[0]?.id ?? "",
      location: null,
      memoryDate: rows[0]?.memory_date ?? "",
      reaction: {
        counts: { cry: 0, heart: 0, laugh: 0, star: 0 },
        currentReaction: null,
        members: { cry: [], heart: [], laugh: [], star: [] },
      },
      title: "Anchor",
    });

    await getVaultPage(cursor);

    expect(pageQuery.or).toHaveBeenCalledWith(
      expect.stringContaining(`created_at.eq.${rows[0]?.created_at}`),
    );
    expect(pageQuery.or).toHaveBeenCalledWith(expect.stringContaining(`id.lt.${rows[0]?.id}`));
  });

  it("returns no cursor for the final page", async () => {
    const query = createQuery(rows.slice(0, 4));
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-id" } } }) },
      from: vi.fn(() => ({ select: vi.fn(() => query) })),
    });

    await expect(getVaultPage(null)).resolves.toMatchObject({ nextCursor: null });
  });

  it("resets malformed and extra-field cursors without applying a predicate", async () => {
    const query = createQuery([]);
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-id" } } }) },
      from: vi.fn(() => ({ select: vi.fn(() => query) })),
    });
    const extraFieldCursor = Buffer.from(
      JSON.stringify({
        createdAt: "2026-08-23T10:00:00.000Z",
        id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
        memoryDate: "2026-08-23",
        unexpected: true,
        v: 1,
      }),
    ).toString("base64url");

    await expect(getVaultPage(extraFieldCursor)).resolves.toMatchObject({
      cursorReset: true,
      memories: [],
    });
    expect(query.or).not.toHaveBeenCalled();
  });

  it("resets a stale anchor without revealing why it became unavailable", async () => {
    const anchorQuery = {
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    anchorQuery.eq.mockReturnValue(anchorQuery);
    anchorQuery.is.mockReturnValue(anchorQuery);
    const firstPageQuery = createQuery([]);
    createClientMock
      .mockResolvedValueOnce({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-id" } } }) },
      })
      .mockResolvedValueOnce({ from: vi.fn(() => ({ select: vi.fn(() => anchorQuery) })) })
      .mockResolvedValueOnce({ from: vi.fn(() => ({ select: vi.fn(() => firstPageQuery) })) });
    const cursor = vaultCursor.encode({
      coverPhotoUrl: null,
      commentCount: 0,
      createdAt: "2026-08-23T10:00:00.000Z",
      description: null,
      id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
      location: null,
      memoryDate: "2026-08-23",
      reaction: {
        counts: { cry: 0, heart: 0, laugh: 0, star: 0 },
        currentReaction: null,
        members: { cry: [], heart: [], laugh: [], star: [] },
      },
      title: "Anchor",
    });

    await expect(getVaultPage(cursor)).resolves.toMatchObject({
      cursorReset: true,
      memories: [],
    });
    expect(firstPageQuery.or).not.toHaveBeenCalled();
  });
});
