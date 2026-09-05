import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  UpdateActiveMembershipDisplayNameError,
  updateActiveMembershipDisplayName,
  updateActiveMembershipDisplayNameRequestSchema,
} from "./update-active-membership-display-name";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const EXPECTED_UPDATED_AT = "2026-09-05T16:00:00.000Z";
const UPDATED_AT = "2026-09-05T16:01:00.000Z";

function input(displayName: string = "Eduardo") {
  return { displayName, expectedUpdatedAt: EXPECTED_UPDATED_AT };
}

function mockSupabase(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
  return rpc;
}

describe("updateActiveMembershipDisplayName", () => {
  beforeEach(() => vi.clearAllMocks());

  it("trims valid input and sends only the authenticated membership RPC arguments", async () => {
    const rpc = mockSupabase({
      display_name: "New name",
      status: "updated",
      updated_at: UPDATED_AT,
    });

    await expect(updateActiveMembershipDisplayName(input("  New name  "))).resolves.toEqual({
      displayName: "New name",
      status: "updated",
      updatedAt: UPDATED_AT,
    });
    expect(rpc).toHaveBeenCalledWith("update_active_membership_display_name", {
      p_display_name: "New name",
      p_expected_updated_at: EXPECTED_UPDATED_AT,
    });
  });

  it("counts Unicode code points at the inclusive request boundaries", () => {
    expect(updateActiveMembershipDisplayNameRequestSchema.safeParse(input("😀a")).success).toBe(
      true,
    );
    expect(
      updateActiveMembershipDisplayNameRequestSchema.safeParse(input("😀".repeat(100))).success,
    ).toBe(true);
    expect(updateActiveMembershipDisplayNameRequestSchema.safeParse(input("😀")).success).toBe(
      false,
    );
    expect(
      updateActiveMembershipDisplayNameRequestSchema.safeParse(input("😀".repeat(101))).success,
    ).toBe(false);
  });

  it("rejects invalid revisions and every extra identity selector before the RPC", async () => {
    const rpc = mockSupabase({ status: "updated" });

    await expect(
      updateActiveMembershipDisplayName({
        displayName: "New name",
        expectedUpdatedAt: "not-a-date",
      }),
    ).resolves.toEqual({ status: "invalid" });
    for (const identity of [
      { membershipId: "other-membership" },
      { ownerId: "other-owner" },
      { role: "owner" },
      { spaceId: "other-space" },
      { userId: "other-user" },
    ]) {
      expect(
        updateActiveMembershipDisplayNameRequestSchema.safeParse({ ...input(), ...identity })
          .success,
      ).toBe(false);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns conflict metadata from the canonical membership", async () => {
    mockSupabase({
      display_name: "Current name",
      status: "conflict",
      updated_at: UPDATED_AT,
    });

    await expect(updateActiveMembershipDisplayName(input())).resolves.toEqual({
      displayName: "Current name",
      status: "conflict",
      updatedAt: UPDATED_AT,
    });
  });

  it.each(["invalid", "unavailable"] as const)("returns the %s domain outcome", async (status) => {
    mockSupabase({ status });

    await expect(updateActiveMembershipDisplayName(input())).resolves.toEqual({ status });
  });

  it("preserves database failures as the error cause", async () => {
    const databaseError = new Error("private database failure");
    mockSupabase(null, databaseError);

    await expect(updateActiveMembershipDisplayName(input())).rejects.toMatchObject({
      cause: databaseError,
      message: "Unable to update the active membership display name.",
      name: "Error",
    });
  });

  it.each([
    null,
    { display_name: "Current name", status: "conflict" },
    { display_name: " Current name ", status: "updated", updated_at: UPDATED_AT },
    {
      display_name: "a".repeat(101),
      status: "updated",
      updated_at: UPDATED_AT,
    },
    { status: "invalid", user_id: "leaked-user" },
    { status: "unknown" },
  ])("rejects malformed RPC response %#", async (response) => {
    mockSupabase(response);

    await expect(updateActiveMembershipDisplayName(input())).rejects.toEqual(
      new UpdateActiveMembershipDisplayNameError(
        "The display-name service returned an invalid response.",
      ),
    );
  });
});
