import { createClient } from "@/lib/supabase/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncCurrentUser } from "./sync-current-user";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("syncCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs the database error while returning a safe error", async () => {
    const databaseError = new Error("new row violates row-level security policy");
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

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
    expect(write).toHaveBeenCalledWith(
      'Failed to sync the current user: {"message":"new row violates row-level security policy"}\n',
    );
  });
});
