import { encodeCursor, memoryCursorSchema } from "@leonly/utils/contracts";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MembershipsService } from "../../spaces/services/memberships.service";
import { MemoryListService } from "./memory-list.service";

const spaceId = "01900000-0000-7000-8000-000000000005";
const memberId = "01900000-0000-7000-8000-000000000006";
const memory = {
  id: "01900000-0000-7000-8000-000000000004",
  title: "A memory",
  memoryDate: "2026-10-01",
  createdAt: "2026-10-01T12:30:00.123456Z",
  description: null,
  location: null,
};

describe("MemoryListService", () => {
  const member = { findFirst: vi.fn() };
  const memories = { findMany: vi.fn() };
  const queryRaw = vi.fn();
  const signObject = vi.fn();
  const prisma = {
    spaceMember: member,
    memory: memories,
    $queryRaw: queryRaw,
  };
  const service = new MemoryListService(
    prisma as never,
    { signObject } as never,
    new MembershipsService(prisma as never),
    { getSummaries: async () => new Map() } as never,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    member.findFirst.mockResolvedValue({ id: memberId, spaceId });
    memories.findMany.mockResolvedValue([]);
    queryRaw.mockResolvedValue([]);
    signObject.mockResolvedValue("https://storage.example/signed");
  });

  it("rejects malformed cursors before querying and unavailable memberships", async () => {
    await expect(
      service.list({ userId: "user", visibility: "timeline", query: { cursor: "!" } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(member.findFirst).not.toHaveBeenCalled();
    member.findFirst.mockResolvedValue(null);
    await expect(
      service.list({ userId: "user", visibility: "timeline", query: {} }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("signs ready covers and uses lookahead to encode the exact last returned timestamp", async () => {
    queryRaw.mockResolvedValue([memory, { ...memory, id: "01900000-0000-7000-8000-000000000003" }]);
    memories.findMany.mockResolvedValue([
      { id: memory.id, coverFile: { file: { variants: [{ objectKey: "cover" }] } } },
    ]);
    const page = await service.list({
      userId: "user",
      visibility: "timeline",
      query: {},
      limit: 1,
    });
    expect(page.data).toEqual([
      { ...memory, reaction: undefined, coverPhotoUrl: "https://storage.example/signed" },
    ]);
    expect(signObject).toHaveBeenCalledWith({ key: "cover", expiresIn: 300 });
    expect(page.meta.nextCursor).toBe(
      encodeCursor({
        schema: memoryCursorSchema,
        payload: {
          id: memory.id,
          memoryDate: memory.memoryDate,
          createdAt: memory.createdAt,
          sort: "newest",
        },
      }),
    );
    expect(page.meta.cursorReset).toBe(false);
  });

  it("resets stale and changed-sort anchors without applying a continuation", async () => {
    const cursor = encodeCursor({
      schema: memoryCursorSchema,
      payload: {
        id: memory.id,
        memoryDate: memory.memoryDate,
        createdAt: memory.createdAt,
        sort: "newest",
      },
    });
    queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([memory]);
    const stale = await service.list({ userId: "user", visibility: "vault", query: { cursor } });
    expect(stale.meta).toEqual({ nextCursor: null, cursorReset: true });
    expect(stale.data[0].coverPhotoUrl).toBeNull();
    queryRaw.mockReset().mockResolvedValue([memory]);
    const reversed = await service.list({
      userId: "user",
      visibility: "vault",
      query: { cursor, sort: "oldest" },
    });
    expect(reversed.meta.cursorReset).toBe(true);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("propagates signing failures rather than fabricating a cover", async () => {
    queryRaw.mockResolvedValue([memory]);
    memories.findMany.mockResolvedValue([
      { id: memory.id, coverFile: { file: { variants: [{ objectKey: "cover" }] } } },
    ]);
    signObject.mockRejectedValue(new Error("storage failed"));
    await expect(
      service.list({ userId: "user", visibility: "timeline", query: {} }),
    ).rejects.toThrow("storage failed");
  });

  it.each(["timeline", "vault"] as const)(
    "scopes %s reads and covers to current membership",
    async (visibility) => {
      queryRaw.mockResolvedValue([memory]);
      await service.list({ userId: "user", visibility, query: {} });
      expect(member.findFirst).toHaveBeenCalledWith({
        where: { userId: "user", deletedAt: null, space: { deletedAt: null } },
        select: { id: true, spaceId: true },
      });
      const sql = queryRaw.mock.calls[0][0];
      expect(sql.text).toContain("m.deleted_at IS NULL");
      expect(sql.text).toContain("sm.deleted_at IS NULL AND s.deleted_at IS NULL");
      expect(sql.values).toEqual(expect.arrayContaining([spaceId, memberId, "user", visibility]));
      expect(memories.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ spaceId, visibility, deletedAt: null }),
        }),
      );
    },
  );

  it.each(["newest", "oldest"] as const)(
    "preserves microseconds in %s anchor and continuation",
    async (sort) => {
      const cursor = encodeCursor({
        schema: memoryCursorSchema,
        payload: {
          id: memory.id,
          memoryDate: memory.memoryDate,
          createdAt: memory.createdAt,
          sort,
        },
      });
      queryRaw.mockResolvedValueOnce([{ id: memory.id }]).mockResolvedValueOnce([memory]);
      const page = await service.list({
        userId: "user",
        visibility: "timeline",
        query: { cursor, sort },
      });
      const anchor = queryRaw.mock.calls[0][0];
      const continuation = queryRaw.mock.calls[1][0];
      expect(anchor.values).toContain(memory.createdAt);
      expect(continuation.values).toContain(memory.createdAt);
      expect(continuation.text).toContain(sort === "newest" ? ") < (" : ") > (");
      expect(continuation.text).toContain(sort === "newest" ? "DESC" : "ASC");
      expect(page.meta).toEqual({ nextCursor: null, cursorReset: false });
    },
  );

  it("returns null for non-ready covers and signs ready covers again on each read", async () => {
    queryRaw.mockResolvedValue([memory]);
    memories.findMany.mockResolvedValueOnce([
      { id: memory.id, coverFile: { file: { variants: [] } } },
    ]);
    const pending = await service.list({ userId: "user", visibility: "timeline", query: {} });
    expect(pending.data[0].coverPhotoUrl).toBeNull();
    expect(signObject).not.toHaveBeenCalled();
    memories.findMany.mockResolvedValue([
      { id: memory.id, coverFile: { file: { variants: [{ objectKey: "cover" }] } } },
    ]);
    signObject.mockResolvedValueOnce("first-url").mockResolvedValueOnce("second-url");
    expect(
      (await service.list({ userId: "user", visibility: "timeline", query: {} })).data[0]
        .coverPhotoUrl,
    ).toBe("first-url");
    expect(
      (await service.list({ userId: "user", visibility: "timeline", query: {} })).data[0]
        .coverPhotoUrl,
    ).toBe("second-url");
    expect(signObject).toHaveBeenCalledTimes(2);
    expect(
      memories.findMany.mock.calls[0][0].select.coverFile.select.file.select.variants.where,
    ).toEqual({
      variantName: "cover",
      status: "ready",
      spaceId,
    });

    member.findFirst.mockResolvedValue(null);
    await expect(
      service.list({ userId: "user", visibility: "timeline", query: {} }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(signObject).toHaveBeenCalledTimes(2);
  });

  it("does not advertise a next page for an exactly full final page", async () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      ...memory,
      id: `01900000-0000-7000-8000-${String(index).padStart(12, "0")}`,
    }));
    queryRaw.mockResolvedValue(rows);
    const page = await service.list({ userId: "user", visibility: "timeline", query: {} });
    expect(page.data).toHaveLength(10);
    expect(page.meta.nextCursor).toBeNull();
  });
});
