import { describe, expect, it } from "vitest";
import { getGoogleAuthCallbackUrl } from "./login-with-google";

describe("getGoogleAuthCallbackUrl", () => {
  it("uses the configured production site URL", () => {
    expect(getGoogleAuthCallbackUrl("https://leonly.eduardov.dev/")).toBe(
      "https://leonly.eduardov.dev/auth/callback",
    );
  });
});
