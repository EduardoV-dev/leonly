import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGoogleAuthReturnUrl, loginWithGoogle } from "./login-with-google";

const { signInSocialMock } = vi.hoisted(() => ({
  signInSocialMock: vi.fn(),
}));

vi.mock("@/constants/environment-variables", () => ({
  ENVIRONMENT_VARIABLES: {
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));

vi.mock("./auth-client", () => ({
  authClient: {
    signIn: { social: signInSocialMock },
  },
}));

beforeEach(() => {
  signInSocialMock.mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null });
});

describe("getGoogleAuthReturnUrl", () => {
  it("returns the welcome start route for the configured site URL", () => {
    expect(getGoogleAuthReturnUrl("https://leonly.eduardov.dev/")).toBe(
      "https://leonly.eduardov.dev/welcome/create/start",
    );
  });
});

describe("loginWithGoogle", () => {
  it("starts the Better Auth Google flow with the frontend return and error URLs", async () => {
    await loginWithGoogle();

    expect(signInSocialMock).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "http://localhost:3000/welcome/create/start",
      errorCallbackURL: "http://localhost:3000/auth/auth-code-error",
    });
  });

  it("surfaces Better Auth sign-in errors", async () => {
    const error = new Error("Google sign-in failed");
    signInSocialMock.mockResolvedValue({ data: null, error });

    await expect(loginWithGoogle()).rejects.toBe(error);
  });
});
