import { ConflictException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { MemoriesService } from "./memories.service";

const input = {
  userId: "user",
  memoryId: "01900000-0000-7000-8000-000000000004",
  visibility: "vault" as const,
  lastKnownUpdatedAt: "2026-09-05T16:00:00.123456Z",
};

function createService() {
  const query = vi.fn();
  const executeRaw = vi.fn().mockResolvedValue(1);
  const findFirst = vi.fn().mockResolvedValue({ id: input.memoryId });
  const membership = vi.fn().mockResolvedValue({ id: "member", spaceId: "space" });
  const transaction = { $queryRaw: query, $executeRaw: executeRaw, memory: { findFirst } };
  const service = new MemoriesService(
    {
      $queryRaw: query,
      $executeRaw: executeRaw,
      memory: { findFirst },
      $transaction: (run: (tx: typeof transaction) => Promise<unknown>) => run(transaction),
    } as never,
    {} as never,
    {} as never,
    { requireActiveMembership: membership } as never,
  );
  return { service, membership, query, executeRaw, findFirst, transaction };
}

describe("MemoriesService.updateVisibility", () => {
  it.each(["timeline", "vault"] as const)("moves a memory to %s", async (visibility) => {
    const { service, query, findFirst } = createService();
    const result = { id: input.memoryId, visibility, updatedAt: "2026-09-05T16:00:00.123457Z" };
    query.mockResolvedValueOnce([result]);

    await expect(service.updateVisibility({ ...input, visibility })).resolves.toEqual(result);
    const statement = query.mock.calls[0][0].join(" ");
    expect(statement).not.toContain("FOR UPDATE");
    expect(statement).toContain("sm.user_id");
    expect(statement).toContain("deleted_at IS NULL");
    expect(query.mock.calls[0]).toContain(input.lastKnownUpdatedAt);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              id: input.memoryId,
              spaceId: "space",
              deletedAt: null,
              space: {
                deletedAt: null,
                members: { some: { id: "member", userId: "user", deletedAt: null } },
              },
            },
            {},
          ],
        },
      }),
    );
  });

  it("rejects an unavailable memory without updating", async () => {
    const { service, query, findFirst } = createService();
    findFirst.mockResolvedValueOnce(null);

    await expect(service.updateVisibility(input)).rejects.toBeInstanceOf(NotFoundException);
    expect(query).not.toHaveBeenCalled();
  });

  it("reports a stale version as a conflict", async () => {
    const { service, query } = createService();
    query.mockResolvedValueOnce([]);
    await expect(service.updateVisibility(input)).rejects.toBeInstanceOf(ConflictException);
  });

  it("reports unavailable instead of a conflict when deletion committed first", async () => {
    const { service, query, findFirst } = createService();
    query.mockResolvedValueOnce([]);
    findFirst.mockResolvedValueOnce({ id: input.memoryId }).mockResolvedValueOnce(null);

    await expect(service.updateVisibility(input)).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it("propagates missing membership without querying memory", async () => {
    const { service, membership, query } = createService();
    membership.mockRejectedValueOnce(new NotFoundException("membership"));

    await expect(service.updateVisibility(input)).rejects.toMatchObject({ message: "membership" });
    expect(query).not.toHaveBeenCalled();
  });

  it("propagates database failures", async () => {
    const { service, query } = createService();
    query.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(service.updateVisibility(input)).rejects.toThrow("database unavailable");
  });
});

describe("MemoriesService.delete", () => {
  it.each(["timeline", "vault"] as const)(
    "locks membership before the memory to delete %s",
    async () => {
      const { service, membership, query, findFirst } = createService();
      await service.delete({ userId: input.userId, memoryId: input.memoryId });

      expect(membership).toHaveBeenCalledWith(
        expect.objectContaining({ lock: true, transaction: expect.anything() }),
      );
      const [lockStatement] = query.mock.calls[0];
      expect(lockStatement.join(" ")).toContain("FOR UPDATE");
      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              {
                id: input.memoryId,
                spaceId: "space",
                deletedAt: null,
                space: {
                  deletedAt: null,
                  members: { some: { id: "member", userId: "user", deletedAt: null } },
                },
              },
              {},
            ],
          },
        }),
      );
    },
  );

  it("cascades comments, reactions, and files before the memory row", async () => {
    const { service, executeRaw } = createService();
    await service.delete({ userId: input.userId, memoryId: input.memoryId });

    const statements = executeRaw.mock.calls.map((call) => call[0].join(" "));
    const commentIndex = statements.findIndex((sql) => sql.includes("UPDATE memory_comments"));
    const reactionIndex = statements.findIndex((sql) => sql.includes("UPDATE memory_reactions"));
    const fileIndex = statements.findIndex((sql) => sql.includes("UPDATE files"));
    const memoryIndex = statements.findIndex((sql) => sql.includes("UPDATE memories"));
    expect(commentIndex).toBeGreaterThan(-1);
    expect(reactionIndex).toBeGreaterThan(commentIndex);
    expect(fileIndex).toBeGreaterThan(reactionIndex);
    expect(memoryIndex).toBeGreaterThan(fileIndex);

    const fileStatement = statements[fileIndex];
    expect(executeRaw.mock.calls[fileIndex].slice(1)).toContain("deleting");
    expect(fileStatement).toContain("original_file_id");
    expect(fileStatement).toContain("memory_files");
    const commentStatement = statements[commentIndex];
    expect(commentStatement).toContain("deleted_at IS NULL");
    expect(statements[memoryIndex]).toContain("deleted_at IS NULL");
  });

  it("rejects unavailable targets without any cascade write", async () => {
    const { service, findFirst, query, executeRaw } = createService();
    findFirst.mockResolvedValueOnce(null);

    await expect(
      service.delete({ userId: input.userId, memoryId: input.memoryId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it("rejects missing membership without querying memory", async () => {
    const { service, membership, query, findFirst, executeRaw } = createService();
    membership.mockRejectedValueOnce(new NotFoundException("membership"));

    await expect(
      service.delete({ userId: input.userId, memoryId: input.memoryId }),
    ).rejects.toMatchObject({
      message: "membership",
    });
    expect(findFirst).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it("rolls the whole cascade back when a child update fails", async () => {
    const { service, executeRaw } = createService();
    executeRaw.mockRejectedValueOnce(new Error("cascade failure"));

    await expect(
      service.delete({ userId: input.userId, memoryId: input.memoryId }),
    ).rejects.toThrow("cascade failure");
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });
});

describe("MemoriesService.requireActiveMemory", () => {
  it.each([undefined, { spaceId: "other-space", deletedAt: { not: null } }])(
    "preserves active membership constraints with additional filters %s",
    async (where) => {
      const { service, findFirst, transaction } = createService();

      await service.requireActiveMemory({
        userId: input.userId,
        memoryId: input.memoryId,
        membership: { id: "member", spaceId: "space" },
        options: { transaction: transaction as never, where },
      });

      expect(findFirst).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              id: input.memoryId,
              spaceId: "space",
              deletedAt: null,
              space: {
                deletedAt: null,
                members: { some: { id: "member", userId: "user", deletedAt: null } },
              },
            },
            where ?? {},
          ],
        },
        select: { id: true },
      });
    },
  );
});
