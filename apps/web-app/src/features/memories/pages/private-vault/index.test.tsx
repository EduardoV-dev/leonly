import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { PrivateVaultPage } from ".";

vi.mock("../../components/vault-memories", () => ({
  VaultMemories: () => <div>Vault memories</div>,
}));

describe("PrivateVaultPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("presents the Vault as a shared archive", () => {
    render(<PrivateVaultPage />);

    expect(screen.getByRole("heading", { name: "Private Vault" })).toBeInTheDocument();
    expect(screen.getByText("Shared archive")).toBeInTheDocument();
    expect(screen.getByText("Visible to both active members")).toBeInTheDocument();
    expect(
      screen.getByText(/These memories stay out of the timeline, never out of reach/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Vault memories")).toBeInTheDocument();
  });
});
