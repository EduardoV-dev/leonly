import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { SignInPage } from ".";

const { loginState, mutateMock } = vi.hoisted(() => ({
  loginState: { isError: false, isPending: false },
  mutateMock: vi.fn(),
}));

vi.mock("../../api/login-with-google", () => ({
  useLoginWithGoogle: () => ({ ...loginState, mutate: mutateMock }),
}));

describe("SignInPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    loginState.isError = false;
    loginState.isPending = false;
    await i18n.changeLanguage("en");
  });

  it("shows an announced recovery message and keeps Google sign-in retryable", () => {
    const { rerender } = render(<SignInPage />);
    const loginButton = screen.getByRole("button", { name: "Continue with Google" });

    fireEvent.click(loginButton);
    expect(mutateMock).toHaveBeenCalledOnce();

    loginState.isError = true;
    rerender(<SignInPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Google sign-in could not start. Check your connection and try again.",
    );
    expect(loginButton).toBeEnabled();

    fireEvent.click(loginButton);
    expect(mutateMock).toHaveBeenCalledTimes(2);
  });
});
