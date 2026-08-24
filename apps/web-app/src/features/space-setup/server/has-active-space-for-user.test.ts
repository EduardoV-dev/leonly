import { describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSpaceForCurrentUser } from "./has-active-space-for-user";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function createQueryMock(result: { data: unknown; error: Error | null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const secondIs = vi.fn().mockReturnValue({ limit });
  const firstIs = vi.fn().mockReturnValue({ is: secondIs });
  const select = vi.fn().mockReturnValue({ is: firstIs });
  const from = vi.fn().mockReturnValue({ select });

  return { from, select, firstIs, secondIs, limit, maybeSingle };
}

describe("hasActiveSpaceForCurrentUser", () => {
  it("returns true when the user has an active space", async () => {
    const query = createQueryMock({
      data: { id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0" },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({ from: query.from } as never);

    await expect(hasActiveSpaceForCurrentUser()).resolves.toBe(true);
    expect(query.from).toHaveBeenCalledWith("space_members");
    expect(query.select).toHaveBeenCalledWith("id, spaces!inner(id, deleted_at)");
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
