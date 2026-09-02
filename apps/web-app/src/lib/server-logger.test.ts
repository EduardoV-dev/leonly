import { describe, expect, it } from "vitest";
import { normalizeError } from "./server-logger";

describe("normalizeError", () => {
  it("keeps conservative native Error fields while redacting sensitive values", () => {
    const error = new Error(
      "OAuth code=oauth-secret state=csrf-secret for leo@example.com at https://example.com/callback?code=oauth-secret",
    );

    expect(normalizeError(error)).toEqual({
      error_type: "Error",
      message: "OAuth code=[REDACTED] state=[REDACTED] for [REDACTED_EMAIL] at [REDACTED_URL]",
    });
  });

  it("omits sensitive Supabase fields including details", () => {
    const supabaseError = {
      code: "PGRST116",
      details: "email=leo@example.com invite_code=invite-secret",
      hint: "authorization=Bearer secret",
      message: "No rows returned for leo@example.com",
      user_metadata: { email: "leo@example.com" },
    };

    expect(normalizeError(supabaseError)).toEqual({
      code: "PGRST116",
      error_type: "UnknownError",
      message: "No rows returned for [REDACTED_EMAIL]",
    });
  });

  it("keeps a sanitized cause for actionable server diagnostics", () => {
    const error = new Error("Unable to place the memory.", {
      cause: {
        code: "PGRST202",
        message: "Could not find function at https://supabase.example/rpc",
      },
    });

    expect(normalizeError(error)).toEqual({
      cause: {
        code: "PGRST202",
        error_type: "UnknownError",
        message: "Could not find function at [REDACTED_URL]",
      },
      error_type: "Error",
      message: "Unable to place the memory.",
    });
  });
});
