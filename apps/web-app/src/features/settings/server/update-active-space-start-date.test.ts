import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  updateActiveSpaceStartDate,
  updateActiveSpaceStartDateRequestSchema,
} from "./update-active-space-start-date";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const input = {
  expectedUpdatedAt: "2026-09-05T16:00:00.000Z",
  startDate: "2025-04-27",
  timezone: "America/Argentina/Buenos_Aires",
};

describe("updateActiveSpaceStartDate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls the identifier-free RPC and normalizes its canonical result", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { start_date: "2025-04-27", status: "updated", updated_at: "2026-09-05T16:01:00.000Z" },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({ rpc } as never);

    await expect(updateActiveSpaceStartDate(input)).resolves.toEqual({
      startDate: "2025-04-27",
      status: "updated",
      updatedAt: "2026-09-05T16:01:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("update_active_space_start_date", {
      p_expected_updated_at: input.expectedUpdatedAt,
      p_start_date: input.startDate,
      p_timezone: input.timezone,
    });
  });

  it("rejects impossible dates, invalid zones, future dates, and resource selectors", async () => {
    expect(
      updateActiveSpaceStartDateRequestSchema.safeParse({ ...input, startDate: "2025-02-30" })
        .success,
    ).toBe(false);
    expect(
      updateActiveSpaceStartDateRequestSchema.safeParse({ ...input, timezone: "not/a-zone" })
        .success,
    ).toBe(false);
    expect(
      updateActiveSpaceStartDateRequestSchema.safeParse({ ...input, startDate: "9999-01-01" })
        .success,
    ).toBe(false);
    expect(
      updateActiveSpaceStartDateRequestSchema.safeParse({ ...input, spaceId: "other-space" })
        .success,
    ).toBe(false);
  });
});
