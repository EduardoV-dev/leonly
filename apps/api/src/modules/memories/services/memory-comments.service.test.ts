import { commentCursorSchema, decodeCursor, encodeCursor } from "@leonly/utils/contracts";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoriesService } from "./memories.service";
import { MemoryCommentsService } from "./memory-comments.service";

const memoryId = "01900000-0000-7000-8000-000000000004";
const spaceId = "01900000-0000-7000-8000-000000000005";
const memberId = "01900000-0000-7000-8000-000000000006";
const commentId = "01900000-0000-7000-8000-000000000007";
const createdAt = "2026-09-05T16:00:00.123456Z";
const row = {
  id: commentId,
  memoryId,
  parentCommentId: null,
  body: "private body",
  createdAt,
  updatedAt: createdAt,
  deletedAt: null,
  authorDisplayName: "Author",
  authorAvatarUrl: null,
  isAuthor: true,
  replyCount: 1,
};

describe("MemoryCommentsService reads", () => {
  const findMemory = vi.fn();
  const findParent = vi.fn();
  const queryRaw = vi.fn();
  const requireActiveMembership = vi.fn();
  const prisma = {
    memory: { findFirst: findMemory },
    memoryComment: { findFirst: findParent },
    $queryRaw: queryRaw,
  };
  const service = new MemoryCommentsService(
    prisma as never,
    { requireActiveMembership } as never,
    new MemoriesService(prisma as never, {} as never, {} as never, {} as never),
  );
  const input = { userId: "user", memoryId, parentCommentId: null };

  beforeEach(() => {
    vi.resetAllMocks();
    requireActiveMembership.mockResolvedValue({ id: memberId, spaceId });
    findMemory.mockResolvedValue({ id: memoryId });
    findParent.mockResolvedValue({ id: commentId });
    queryRaw.mockResolvedValue([]);
  });

  it("returns placeholders without deleted content or author data", async () => {
    queryRaw.mockResolvedValue([{ ...row, deletedAt: createdAt }]);
    const page = await service.read(input);
    expect(page.data).toEqual([
      { id: commentId, memoryId, createdAt, replyCount: 1, deletedAt: createdAt },
    ]);
    expect(page.meta).toEqual({ nextCursor: null, resetCursor: false });
  });

  it("uses lookahead and retains the full cursor tuple", async () => {
    queryRaw.mockResolvedValue(Array.from({ length: 21 }, () => row));
    const page = await service.read(input);
    expect(page.data).toHaveLength(20);
    const cursor = page.meta.nextCursor;
    if (!cursor) throw new Error("Expected a continuation cursor.");
    expect(decodeCursor({ schema: commentCursorSchema, cursor })).toEqual({
      id: commentId,
      memoryId,
      parentCommentId: null,
      createdAt,
    });
  });

  it("resets stale anchors and rejects malformed cursors", async () => {
    const cursor = encodeCursor({
      schema: commentCursorSchema,
      payload: { id: commentId, memoryId, parentCommentId: null, createdAt },
    });
    queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    expect((await service.read({ ...input, cursor })).meta.resetCursor).toBe(true);
    await expect(service.read({ ...input, cursor: "!" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("continues with the complete timestamp and id tuple in each thread direction", async () => {
    const cursor = encodeCursor({
      schema: commentCursorSchema,
      payload: { id: commentId, memoryId, parentCommentId: null, createdAt },
    });
    queryRaw.mockResolvedValueOnce([{ id: commentId }]).mockResolvedValueOnce([]);
    await service.read({ ...input, cursor });
    const rootQuery = queryRaw.mock.calls[1][0];
    expect(rootQuery.sql).toContain("(c.created_at, c.id) <");
    expect(rootQuery.values).toContain(createdAt);
    expect(rootQuery.values).toContain(commentId);
    const replyCursor = encodeCursor({
      schema: commentCursorSchema,
      payload: { id: commentId, memoryId, parentCommentId: commentId, createdAt },
    });
    queryRaw.mockResolvedValueOnce([{ id: commentId }]).mockResolvedValueOnce([]);
    await service.read({ ...input, parentCommentId: commentId, cursor: replyCursor });
    expect(queryRaw.mock.calls[3][0].sql).toContain("(c.created_at, c.id) >");
  });

  it("resets cursors from another authorized thread without using their anchor", async () => {
    const cursor = encodeCursor({
      schema: commentCursorSchema,
      payload: { id: commentId, memoryId, parentCommentId: commentId, createdAt },
    });
    const page = await service.read({ ...input, cursor });
    expect(page.meta).toEqual({ nextCursor: null, resetCursor: true });
    expect(queryRaw).toHaveBeenCalledOnce();
  });

  it("rejects unavailable memories and threads", async () => {
    findMemory.mockResolvedValueOnce(null);
    await expect(service.read(input)).rejects.toBeInstanceOf(NotFoundException);
    findParent.mockResolvedValueOnce(null);
    await expect(service.read({ ...input, parentCommentId: commentId })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("MemoryCommentsService writes", () => {
  const member = { id: memberId, spaceId };
  const lastKnownUpdatedAt = createdAt;
  const scope = { userId: "user", memoryId, commentId, lastKnownUpdatedAt };
  const queryRaw = vi.fn();
  const create = vi.fn();
  const transaction = { $queryRaw: queryRaw, memoryComment: { create } };
  const membershipsService = {
    requireActiveMembership: async () => (await queryRaw`SELECT id FROM space_members`)[0],
  };
  const memoriesService = { requireActiveMemory: vi.fn() };
  const service = new MemoryCommentsService(
    {
      $transaction: (operation: (tx: typeof transaction) => unknown) => operation(transaction),
    } as never,
    membershipsService as never,
    memoriesService as never,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    queryRaw.mockResolvedValueOnce([member]);
  });

  it("rejects a missing or deleted parent", async () => {
    queryRaw.mockResolvedValueOnce([]);
    await expect(
      service.create({ userId: "user", memoryId, body: "Reply", parentCommentId: commentId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a normalized comment", async () => {
    create.mockResolvedValue({ id: commentId });
    queryRaw.mockResolvedValueOnce([
      {
        id: commentId,
        memoryId,
        parentCommentId: null,
        body: "Text",
        createdAt,
        updatedAt: lastKnownUpdatedAt,
        replyCount: 0,
        authorDisplayName: "Author",
        authorAvatarUrl: null,
        isAuthor: true,
        deletedAt: null,
      },
    ]);
    const result = await service.create({
      userId: "user",
      memoryId,
      body: " Text ",
      parentCommentId: null,
    });
    expect(result).toMatchObject({ deletedAt: null, body: "Text", updatedAt: lastKnownUpdatedAt });
    expect(create.mock.calls[0][0].data.body).toBe("Text");
  });

  it("rejects unauthorized targets before evaluating the revision", async () => {
    queryRaw.mockResolvedValueOnce([]);
    await expect(service.remove(scope)).rejects.toBeInstanceOf(NotFoundException);
    expect(queryRaw).toHaveBeenCalledTimes(2);
  });

  it("rejects stale revisions without deleting the comment", async () => {
    queryRaw.mockResolvedValueOnce([{ id: commentId }]).mockResolvedValueOnce([]);
    await expect(service.remove(scope)).rejects.toBeInstanceOf(ConflictException);
    expect(queryRaw.mock.calls[2][0].values).toContain(lastKnownUpdatedAt);
  });

  it("advances the timestamp strictly on a successful deletion", async () => {
    queryRaw.mockResolvedValueOnce([{ id: commentId }]).mockResolvedValueOnce([{ id: commentId }]);
    expect(await service.remove(scope)).toEqual({ deletedCommentId: commentId });
    expect(queryRaw.mock.calls[2][0].sql).toContain("interval '1 microsecond'");
  });

  it("does not attach a reply after the root was deleted", async () => {
    queryRaw.mockResolvedValueOnce([{ id: commentId }]).mockResolvedValueOnce([{ id: commentId }]);
    await service.remove(scope);
    queryRaw.mockResolvedValueOnce([member]).mockResolvedValueOnce([]);
    await expect(
      service.create({ userId: "user", memoryId, body: "Reply", parentCommentId: commentId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
    expect(queryRaw.mock.calls[4][0].join(" ")).toContain("FOR UPDATE");
  });

  it("serializes a competing reply after a root deletion", async () => {
    let queue = Promise.resolve();
    let deleted = false;
    const fakeTransaction = {
      $queryRaw: async (statement: TemplateStringsArray | { sql: string }) => {
        const sql = Array.isArray(statement)
          ? statement.join(" ")
          : (statement as { sql: string }).sql;
        if (sql.includes("FROM space_members")) return [member];
        if (sql.includes("parent_comment_id IS NULL")) return deleted ? [] : [{ id: commentId }];
        if (sql.includes("SELECT id FROM memory_comments")) return [{ id: commentId }];
        if (sql.includes("UPDATE memory_comments")) {
          deleted = true;
          return [{ id: commentId }];
        }
        throw new Error("Unexpected query");
      },
      memoryComment: { create: vi.fn() },
    };
    const serviceWithLocks = new MemoryCommentsService(
      {
        $transaction: (operation: (tx: typeof fakeTransaction) => Promise<unknown>) => {
          const result = queue.then(() => operation(fakeTransaction));
          queue = result.then(
            () => undefined,
            () => undefined,
          );
          return result;
        },
      } as never,
      {
        requireActiveMembership: async () =>
          (await fakeTransaction.$queryRaw`SELECT id FROM space_members`)[0],
      } as never,
      memoriesService as never,
    );
    const deletion = serviceWithLocks.remove(scope);
    const reply = serviceWithLocks.create({
      userId: "user",
      memoryId,
      body: "Reply",
      parentCommentId: commentId,
    });
    await expect(deletion).resolves.toEqual({ deletedCommentId: commentId });
    await expect(reply).rejects.toBeInstanceOf(NotFoundException);
    expect(fakeTransaction.memoryComment.create).not.toHaveBeenCalled();
  });
});
