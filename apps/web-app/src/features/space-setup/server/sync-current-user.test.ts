import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { syncCurrentUser } from "./sync-current-user";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("syncCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs the database error while returning a safe error", async () => {
    const databaseError = {
      code: "42501",
      details: "Rejected by users policy",
      hint: null,
      message: "new row violates row-level security policy",
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "leo@example.com",
              id: "a8d7d357-9435-4dcc-8b53-3bae9b885a05",
              user_metadata: {},
            },
          },
        }),
      },
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: databaseError }),
      }),
    } as never);

    await expect(syncCurrentUser()).rejects.toThrow("Failed to sync the current user.");
    expect(consoleError).toHaveBeenCalledWith("Failed to sync the current user.", databaseError);
  });
});
