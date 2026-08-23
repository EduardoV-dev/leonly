import { beforeEach, describe, expect, it, vi } from "vitest";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import { syncCurrentUser } from "./sync-current-user";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/server-logger", () => ({
  logServerError: vi.fn(),
}));

describe("syncCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists the Google profile name", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const user = {
      email: "leo@example.com",
      id: "a8d7d357-9435-4dcc-8b53-3bae9b885a05",
      user_metadata: { name: "Google Name" },
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn().mockReturnValue({ upsert }),
    } as never);

    await syncCurrentUser();

    expect(upsert).toHaveBeenCalledWith({
      avatar_url: null,
      email: user.email,
      id: user.id,
      is_active: true,
      name: "Google Name",
    });
  });

  it("logs the database error while returning a safe error", async () => {
    const databaseError = {
      code: "42501",
      details: "Rejected by users policy",
      hint: null,
      message: "new row violates row-level security policy",
    };
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
    expect(logServerError).toHaveBeenCalledWith(
      { event: "supabase_operation_failed", operation: "sync_current_user" },
      databaseError,
    );
  });
});
