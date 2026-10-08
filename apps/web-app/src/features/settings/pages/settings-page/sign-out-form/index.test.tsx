import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { SignOutForm } from "./index";

const { signOut, assign } = vi.hoisted(() => ({ signOut: vi.fn(), assign: vi.fn() }));
vi.mock("@/features/auth/api/auth-client", () => ({ authClient: { signOut } }));

describe("SignOutForm", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal("location", { assign });
    await act(() => i18n.changeLanguage("en"));
  });

  it("uses Better Auth sign-out and navigates to authentication after success", async () => {
    signOut.mockResolvedValue({ error: null });
    render(<SignOutForm />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out of Leonly" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/auth"));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("disables the action while pending and permits retry after failure", async () => {
    let finish!: (value: unknown) => void;
    signOut.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<SignOutForm />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out of Leonly" }));
    expect(await screen.findByRole("button", { name: "Signing out…" })).toBeDisabled();
    await act(async () => finish({ error: { message: "private detail" } }));
    expect(screen.getByRole("status")).not.toBeEmptyDOMElement();
    expect(screen.getByRole("status")).not.toHaveTextContent("private detail");
    expect(assign).not.toHaveBeenCalled();
    signOut.mockResolvedValueOnce({ error: null });
    fireEvent.click(screen.getByRole("button", { name: "Sign out of Leonly" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/auth"));
  });

  it("keeps a failed network request recoverable", async () => {
    signOut.mockRejectedValue(new Error("offline"));
    render(<SignOutForm />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out of Leonly" }));
    await waitFor(() => expect(screen.getByRole("status")).not.toBeEmptyDOMElement());
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign out of Leonly" })).toBeEnabled();
  });
});
