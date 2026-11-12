import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoriesService } from "./memories.service";
import { MemoryReactionsService } from "./memory-reactions.service";

describe("MemoryReactionsService", () => {
  const member = { id: "member", spaceId: "space" };
  const memberships = { requireActiveMembership: vi.fn() };
  const reactions = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  };
  const memory = { findFirst: vi.fn() };
  const lock = vi.fn();
  const transaction = { memoryReaction: reactions, memory, $queryRaw: lock };
  const prisma = { ...transaction, $transaction: vi.fn(async (callback) => callback(transaction)) };
  const memoriesService = new MemoriesService(
    prisma as never,
    {} as never,
    {} as never,
    memberships as never,
  );
  const service = new MemoryReactionsService(
    prisma as never,
    memberships as never,
    memoriesService,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    memberships.requireActiveMembership.mockResolvedValue(member);
    memory.findFirst.mockResolvedValue({ id: "memory" });
    reactions.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (callback) => callback(transaction));
  });

  it("returns all types, sorted names including duplicates, and the caller's selection", async () => {
    reactions.findMany.mockResolvedValue([
      {
        memoryId: "memory",
        reactionType: "heart",
        reactedByMemberId: "other",
        reactedByMember: { displayName: "Zoe" },
      },
      {
        memoryId: "memory",
        reactionType: "heart",
        reactedByMemberId: "member",
        reactedByMember: { displayName: "Alex" },
      },
      {
        memoryId: "memory",
        reactionType: "heart",
        reactedByMemberId: "third",
        reactedByMember: { displayName: "Alex" },
      },
      ...["laugh", "cry", "star"].map((reactionType) => ({
        memoryId: "memory",
        reactionType,
        reactedByMemberId: "other",
        reactedByMember: { displayName: "Sam" },
      })),
    ]);
    const summary = await service.read({ userId: "user", memoryId: "memory" });
    expect(summary).toEqual({
      counts: { heart: 3, laugh: 1, cry: 1, star: 1 },
      currentReaction: "heart",
      members: { heart: ["Alex", "Alex", "Zoe"], laugh: ["Sam"], cry: ["Sam"], star: ["Sam"] },
    });
    expect(reactions.findMany.mock.calls[0][0].where).toMatchObject({
      spaceId: "space",
      reactedByMember: { deletedAt: null },
    });
  });

  it("keeps repeated reads and different memories independent", async () => {
    reactions.findMany
      .mockResolvedValueOnce([
        {
          memoryId: "memory",
          reactionType: "heart",
          reactedByMemberId: "member",
          reactedByMember: { displayName: "Alex" },
        },
      ])
      .mockResolvedValueOnce([
        {
          memoryId: "memory",
          reactionType: "heart",
          reactedByMemberId: "member",
          reactedByMember: { displayName: "Alex" },
        },
      ])
      .mockResolvedValueOnce([]);
    const first = await service.read({ userId: "user", memoryId: "memory" });
    const second = await service.read({ userId: "user", memoryId: "memory" });
    const other = await service.read({ userId: "user", memoryId: "other" });
    expect(first.counts.heart).toBe(1);
    expect(second.members.heart).toEqual(["Alex"]);
    expect(other.counts.heart).toBe(0);
    expect(other.currentReaction).toBeNull();
  });

  it("groups batched reaction summaries by memory", async () => {
    reactions.findMany.mockResolvedValue([
      {
        memoryId: "a",
        reactionType: "heart",
        reactedByMemberId: "member",
        reactedByMember: { displayName: "Alex" },
      },
      {
        memoryId: "b",
        reactionType: "star",
        reactedByMemberId: "other",
        reactedByMember: { displayName: "Sam" },
      },
    ]);
    const summaries = await service.getSummaries({
      memoryIds: ["a", "b", "c"],
      spaceId: "space",
      memberId: "member",
    });
    expect(summaries.get("a")?.currentReaction).toBe("heart");
    expect(summaries.get("b")?.members.star).toEqual(["Sam"]);
    expect(summaries.get("c")?.counts.heart).toBe(0);
    expect(reactions.findMany.mock.calls[0][0].where).toEqual({
      memoryId: { in: ["a", "b", "c"] },
      spaceId: "space",
      deletedAt: null,
      reactedByMember: { deletedAt: null, spaceId: "space" },
    });
  });

  it("reads the updated summary using the transaction client", async () => {
    const transactionFindMany = vi.fn().mockResolvedValue([
      {
        memoryId: "memory",
        reactionType: "heart",
        reactedByMemberId: "member",
        reactedByMember: { displayName: "Alex" },
      },
    ]);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        ...transaction,
        memoryReaction: { ...reactions, findMany: transactionFindMany },
      }),
    );

    const summary = await service.toggle({
      userId: "user",
      memoryId: "memory",
      reactionType: "heart",
    });
    expect(summary.currentReaction).toBe("heart");
    expect(summary.members.heart).toEqual(["Alex"]);
    expect(reactions.findMany).not.toHaveBeenCalled();
  });

  it("excludes tombstoned reactions from summaries", async () => {
    await service.read({ userId: "user", memoryId: "memory" });
    expect(reactions.findMany.mock.calls[0][0].where).toEqual({
      memoryId: { in: ["memory"] },
      spaceId: "space",
      deletedAt: null,
      reactedByMember: { deletedAt: null, spaceId: "space" },
    });
  });

  it.each([
    { case: "create", current: null, updateData: null },
    { case: "revive", current: null, updateData: null },
    {
      case: "retype",
      current: { reactionType: "laugh", deletedAt: null },
      updateData: { deletedAt: null, reactionType: "heart" },
    },
    {
      case: "soft-delete",
      current: { reactionType: "heart", deletedAt: null },
      updateData: { deletedAt: expect.any(Date) },
    },
  ])("locks before the $case transition", async ({ current, updateData }) => {
    reactions.findUnique.mockResolvedValue(current);
    await service.toggle({ userId: "user", memoryId: "memory", reactionType: "heart" });
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(
      reactions.findUnique.mock.invocationCallOrder[0],
    );
    if (current === null) {
      expect(reactions.upsert).toHaveBeenCalledOnce();
      expect(reactions.update).not.toHaveBeenCalled();
      return;
    }
    expect(reactions.upsert).not.toHaveBeenCalled();
    expect(reactions.update).toHaveBeenCalledOnce();
    expect(reactions.update.mock.calls[0][0].data).toEqual(updateData);
  });

  it("rejects unavailable memories and propagates unexpected errors", async () => {
    memory.findFirst.mockResolvedValue(null);
    await expect(service.read({ userId: "user", memoryId: "memory" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    memory.findFirst.mockResolvedValue({ id: "memory" });
    reactions.findMany.mockRejectedValue(new Error("storage failure"));
    await expect(service.read({ userId: "user", memoryId: "memory" })).rejects.toThrow(
      "storage failure",
    );
  });

  it("isolates the member's toggle and rechecks authorization inside the transaction", async () => {
    await service.toggle({ userId: "user", memoryId: "memory", reactionType: "heart" });
    expect(memory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              id: "memory",
              spaceId: "space",
              deletedAt: null,
              space: {
                deletedAt: null,
                members: { some: { id: "member", userId: "user", deletedAt: null } },
              },
            }),
          ]),
        }),
      }),
    );
    expect(reactions.upsert).toHaveBeenCalledWith({
      where: { reactedByMemberId_memoryId: { reactedByMemberId: "member", memoryId: "memory" } },
      create: {
        memoryId: "memory",
        spaceId: "space",
        reactedByMemberId: "member",
        reactionType: "heart",
      },
      update: { deletedAt: null, reactionType: "heart" },
    });
    expect(reactions.findUnique).toHaveBeenCalledWith({
      where: {
        reactedByMemberId_memoryId: { reactedByMemberId: "member", memoryId: "memory" },
        deletedAt: null,
      },
    });
  });

  it("propagates transaction failures instead of returning a partial success", async () => {
    let persisted = false;
    let pending = false;
    reactions.create.mockImplementation(async () => {
      pending = true;
    });
    prisma.$transaction.mockImplementation(async (callback) => {
      pending = persisted;
      const result = await callback(transaction);
      persisted = pending;
      return result;
    });
    reactions.findMany.mockRejectedValue(new Error("summary failed"));
    await expect(
      service.toggle({ userId: "user", memoryId: "memory", reactionType: "heart" }),
    ).rejects.toThrow("summary failed");
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(persisted).toBe(false);
  });

  it("applies two serialized first toggles as add then soft-delete", async () => {
    let isActive = false;
    let queue = Promise.resolve();
    prisma.$transaction.mockImplementation((callback) => {
      const result = queue.then(() => callback(transaction));
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    });
    reactions.findUnique.mockImplementation(async () =>
      isActive ? { reactionType: "heart", deletedAt: null } : null,
    );
    reactions.upsert.mockImplementation(async () => {
      isActive = true;
    });
    reactions.update.mockImplementation(async ({ data }) => {
      isActive = data.deletedAt === null;
    });
    await Promise.all([
      service.toggle({ userId: "user", memoryId: "memory", reactionType: "heart" }),
      service.toggle({ userId: "user", memoryId: "memory", reactionType: "heart" }),
    ]);
    expect(isActive).toBe(false);
    expect(reactions.upsert).toHaveBeenCalledOnce();
    expect(reactions.update).toHaveBeenCalledOnce();
    expect(reactions.update.mock.calls[0][0].data.deletedAt).toBeInstanceOf(Date);
  });
});
