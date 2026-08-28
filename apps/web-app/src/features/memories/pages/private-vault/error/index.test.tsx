import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { PrivateVaultError } from ".";

describe("PrivateVaultError", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("offers a safe route retry", () => {
    const onRetry = vi.fn();
    render(<PrivateVaultError onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("We could not open the Private Vault");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
