import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { MembershipsService } from "./memberships.service";

describe("active membership lookup", () => {
  it("uses the transaction without locking unless explicitly requested", async () => {
    const membership = { id: "member", spaceId: "space" };
    const findFirst = vi.fn().mockResolvedValue(membership);
    const queryRaw = vi.fn().mockResolvedValue([membership]);
    const transaction = { spaceMember: { findFirst }, $queryRaw: queryRaw };
    const service = new MembershipsService({} as never);

    await expect(
      service.requireActiveMembership({ userId: "user", transaction: transaction as never }),
    ).resolves.toEqual(membership);
    expect(queryRaw).not.toHaveBeenCalled();
    await expect(
      service.requireActiveMembership({
        userId: "user",
        transaction: transaction as never,
        lock: true,
      }),
    ).resolves.toEqual(membership);
    expect(queryRaw.mock.calls[0][0].join(" ")).toContain("FOR UPDATE OF sm, s");
    queryRaw.mockResolvedValueOnce([]);
    await expect(
      service.requireActiveMembership({
        userId: "user",
        transaction: transaction as never,
        lock: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.requireActiveMembership({ userId: "user", lock: true })).rejects.toThrow(
      "A transaction is required",
    );
  });
});
