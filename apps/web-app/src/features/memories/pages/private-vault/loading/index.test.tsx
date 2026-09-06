import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/lib/i18n";
import { PrivateVaultLoading } from ".";

describe("PrivateVaultLoading", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders a Vault-shaped route loading state", () => {
    render(<PrivateVaultLoading />);

    expect(screen.getByRole("status", { name: "Loading Private Vault" })).toBeInTheDocument();
    expect(document.querySelectorAll("article")).toHaveLength(4);
  });
});
