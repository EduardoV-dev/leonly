import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../../generated/prisma/client";
import { MembershipsService } from "./memberships.service";

const invite = {
  createdByUserId: "owner",
  id: "space-id",
  inviteCodeExpiresAt: new Date(Date.now() + 60_000),
  members: [{ id: "owner-membership" }],
};

function createService() {
  const state = {
    invite: { ...invite, members: [...invite.members] },
    inviteAvailable: true,
    joined: false,
  };
  const tx = {
    space: {
      findFirst: vi.fn(async () => (state.inviteAvailable ? state.invite : null)),
      findUnique: vi.fn(async () => (state.inviteAvailable ? state.invite : null)),
      update: vi.fn(async () => {
        state.inviteAvailable = false;
      }),
    },
    spaceMember: {
      findFirst: vi.fn(async () => (state.joined ? { id: "partner-membership" } : null)),
      updateMany: vi.fn(async () => ({ count: 1 })),
      create: vi.fn(async () => {
        state.joined = true;
      }),
    },
    $queryRaw: vi.fn(async () => {
      return state.inviteAvailable ? [{ id: "space-id" }] : [];
    }),
  };
  let transactionQueue = Promise.resolve();
  const prisma = {
    ...tx,
    $transaction: (operation: (transaction: typeof tx) => Promise<unknown>) => {
      const result = transactionQueue.then(() => operation(tx));
      transactionQueue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
  return {
    service: new MembershipsService(prisma as never),
    state,
    tx,
  };
}

describe("MembershipsService invite flow", () => {
  let fixture: ReturnType<typeof createService>;

  beforeEach(() => {
    fixture = createService();
  });

  it("marks the current active membership setup complete", async () => {
    await expect(fixture.service.completeSetup("owner-user")).resolves.toEqual({ completed: true });
    expect(fixture.tx.spaceMember.updateMany).toHaveBeenCalledWith({
      where: { userId: "owner-user", deletedAt: null, space: { deletedAt: null } },
      data: { onboardingCompletedAt: expect.any(Date) },
    });
  });

  it("throws a conflict when no active membership can be completed", async () => {
    fixture.tx.spaceMember.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(fixture.service.completeSetup("missing-user")).rejects.toThrow(ConflictException);
  });

  it.each(["lny7kmp2", "LNY-7KMP2", " \tLnY-7kMp2\r ", "\u00a0LNY-7KMP2\u00a0"])(
    "normalizes usable invite %s",
    async (inviteCode) => {
      expect(await fixture.service.validateInvite({ userId: "partner-user", inviteCode })).toEqual({
        status: "valid",
      });
      expect(fixture.tx.space.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { inviteCode: "lny7kmp2", deletedAt: null } }),
      );
    },
  );

  it.each(["LNY--7KMP2", "LNY7-KMP2", "LNY-7KMP22", "LNY-7KMP0"])(
    "rejects malformed code %s in validation and joining before lookup",
    async (inviteCode) => {
      expect(await fixture.service.validateInvite({ userId: "partner-user", inviteCode })).toEqual({
        status: "malformed",
      });
      expect(
        await fixture.service.join({ userId: "partner-user", accountName: "Partner", inviteCode }),
      ).toEqual({ status: "malformed" });
      expect(fixture.tx.space.findFirst).not.toHaveBeenCalled();
      expect(fixture.tx.$queryRaw).not.toHaveBeenCalled();
    },
  );

  it("rejects unavailable and expired invites", async () => {
    fixture.state.inviteAvailable = false;
    expect(
      await fixture.service.validateInvite({ userId: "partner-user", inviteCode: "LNY-7KMP2" }),
    ).toEqual({
      status: "unavailable",
    });
    fixture.state.inviteAvailable = true;
    fixture.state.invite.inviteCodeExpiresAt = new Date(Date.now() - 1);
    expect(
      await fixture.service.validateInvite({ userId: "partner-user", inviteCode: "LNY-7KMP2" }),
    ).toEqual({
      status: "unavailable",
    });
  });

  it("propagates transient database failures", async () => {
    fixture.tx.space.findFirst.mockRejectedValueOnce(new Error("private database error"));

    await expect(
      fixture.service.validateInvite({ userId: "partner-user", inviteCode: "LNY-7KMP2" }),
    ).rejects.toThrow("private database error");
  });

  it("rejects a supplied invalid name before touching invite state", async () => {
    expect(
      await fixture.service.join({
        userId: "partner-user",
        accountName: "Account Name",
        inviteCode: "LNY-7KMP2",
        displayName: "x",
      }),
    ).toEqual({
      status: "invalid_name",
    });
    expect(fixture.tx.$queryRaw).not.toHaveBeenCalled();
    expect(fixture.tx.spaceMember.create).not.toHaveBeenCalled();
  });

  it("hides self-join, existing membership, and full-space states behind one outcome", async () => {
    fixture.state.invite.createdByUserId = "partner-user";
    expect(
      await fixture.service.validateInvite({ userId: "partner-user", inviteCode: "LNY-7KMP2" }),
    ).toEqual({
      status: "unavailable",
    });
    fixture.state.invite.createdByUserId = "owner";
    fixture.state.joined = true;
    expect(
      await fixture.service.validateInvite({ userId: "partner-user", inviteCode: "LNY-7KMP2" }),
    ).toEqual({
      status: "unavailable",
    });
    fixture.state.joined = false;
    fixture.state.invite.members.push({ id: "partner-membership" });
    expect(
      await fixture.service.validateInvite({ userId: "partner-user", inviteCode: "LNY-7KMP2" }),
    ).toEqual({
      status: "unavailable",
    });
  });

  it("maps a concurrent last-slot uniqueness race to generic unavailable", async () => {
    fixture.tx.spaceMember.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("unique collision", {
        code: "P2002",
        clientVersion: "7.10.0",
        meta: { target: ["user_id"] },
      }),
    );

    expect(
      await fixture.service.join({
        userId: "partner-user",
        accountName: "Partner",
        inviteCode: "LNY-7KMP2",
      }),
    ).toEqual({
      status: "unavailable",
    });
  });

  it("allows only one of two concurrent requests to consume the last slot", async () => {
    const results = await Promise.all([
      fixture.service.join({
        userId: "partner-user",
        accountName: "Partner",
        inviteCode: "LNY-7KMP2",
      }),
      fixture.service.join({
        userId: "another-user",
        accountName: "Other Partner",
        inviteCode: "LNY-7KMP2",
      }),
    ]);

    expect(results.map(({ status }) => status).sort()).toEqual(["joined", "unavailable"]);
    expect(fixture.tx.spaceMember.create).toHaveBeenCalledTimes(1);
  });

  it("uses the account-name fallback during atomic redemption", async () => {
    expect(
      await fixture.service.join({
        userId: "partner-user",
        accountName: " Account Name ",
        inviteCode: "LNY-7KMP2",
        displayName: " ",
      }),
    ).toEqual({
      space_id: "space-id",
      status: "joined",
    });
    expect(fixture.tx.spaceMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        displayName: "Account Name",
        role: "partner",
        userId: "partner-user",
      }),
    });
    expect(fixture.tx.space.update).toHaveBeenCalledWith({
      where: { id: "space-id" },
      data: { inviteCode: null, inviteCodeExpiresAt: null, updatedByUserId: "partner-user" },
    });
  });
});
