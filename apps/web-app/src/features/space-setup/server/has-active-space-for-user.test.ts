import { describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSpaceForCurrentUser } from "./has-active-space-for-user";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function createQueryMock(result: { data: unknown; error: Error | null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const is = vi.fn().mockReturnValue({ limit });
  const secondEq = vi.fn().mockReturnValue({ is });
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
  const select = vi.fn().mockReturnValue({ eq: firstEq });
  const from = vi.fn().mockReturnValue({ select });

  return { from, select, firstEq, secondEq, is, limit, maybeSingle };
}

describe("hasActiveSpaceForCurrentUser", () => {
  it("returns true when the user has an active space", async () => {
    const query = createQueryMock({ data: { id: 1 }, error: null });
    vi.mocked(createClient).mockResolvedValue({ from: query.from } as never);

    await expect(hasActiveSpaceForCurrentUser()).resolves.toBe(true);
    expect(query.from).toHaveBeenCalledWith("space_members");
    expect(query.select).toHaveBeenCalledWith("id, spaces!inner(id, is_active, deleted_at)");
  });

  it("returns false when the user has no active space", async () => {
    const query = createQueryMock({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue({ from: query.from } as never);

    await expect(hasActiveSpaceForCurrentUser()).resolves.toBe(false);
  });

  it("surfaces query failures", async () => {
    const query = createQueryMock({ data: null, error: new Error("query failed") });
    vi.mocked(createClient).mockResolvedValue({ from: query.from } as never);

    await expect(hasActiveSpaceForCurrentUser()).rejects.toThrow(
      "Failed to check the active space.",
    );
  });
});
