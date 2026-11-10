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
  const findFirst = vi.fn().mockResolvedValue({ id: input.memoryId });
  const membership = vi.fn().mockResolvedValue({ id: "member", spaceId: "space" });
  const transaction = { $queryRaw: query, memory: { findFirst } };
  const service = new MemoriesService(
    {
      $queryRaw: query,
      memory: { findFirst },
      $transaction: (run: (tx: typeof transaction) => Promise<unknown>) => run(transaction),
    } as never,
    {} as never,
    {} as never,
    { requireActiveMembership: membership } as never,
  );
  return { service, membership, query, findFirst, transaction };
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
            { visibility: { not: visibility } },
          ],
        },
      }),
    );
  });

  it("rejects an unavailable or already placed memory without updating", async () => {
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
