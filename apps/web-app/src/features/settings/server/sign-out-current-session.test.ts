import { beforeEach, describe, expect, it, vi } from "vitest";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import { signOutCurrentSession } from "./sign-out-current-session";

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/server-logger", () => ({ logServerError: vi.fn() }));

function mockSupabase({
  signOutError = null,
  user = { id: "9e12d25f-5f14-492e-8844-36dab92e740d" },
  userError = null,
}: {
  signOutError?: unknown;
  user?: null | { id: string };
  userError?: unknown;
} = {}) {
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: userError });
  const signOut = vi.fn().mockResolvedValue({ error: signOutError });
  vi.mocked(createClient).mockResolvedValue({ auth: { getUser, signOut } } as never);
  return { getUser, signOut };
}

describe("signOutCurrentSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("signs out only the current session and redirects to authentication", async () => {
    const { signOut } = mockSupabase();

    await expect(signOutCurrentSession({ status: "idle" })).rejects.toThrow("NEXT_REDIRECT:/auth");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("redirects an already signed-out user without another mutation", async () => {
    const { signOut } = mockSupabase({ user: null });

    await expect(signOutCurrentSession({ status: "idle" })).rejects.toThrow("NEXT_REDIRECT:/auth");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("returns a generic recoverable state when sign-out fails", async () => {
    const signOutError = { message: "private auth detail" };
    mockSupabase({ signOutError });

    await expect(signOutCurrentSession({ status: "idle" })).resolves.toEqual({
      status: "error",
    });
    expect(logServerError).toHaveBeenCalledWith(
      { event: "supabase_operation_failed", operation: "sign_out" },
      signOutError,
    );
  });

  it("does not attempt sign-out when session verification fails", async () => {
    const userError = { message: "private auth detail" };
    const { signOut } = mockSupabase({ user: null, userError });

    await expect(signOutCurrentSession({ status: "idle" })).resolves.toEqual({
      status: "error",
    });
    expect(signOut).not.toHaveBeenCalled();
  });
});
