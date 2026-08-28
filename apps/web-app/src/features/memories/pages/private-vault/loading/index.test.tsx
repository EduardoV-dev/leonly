import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrivateVaultLoading } from ".";

describe("PrivateVaultLoading", () => {
  it("renders a Vault-shaped route loading state", () => {
    render(<PrivateVaultLoading />);

    expect(screen.getByRole("status", { name: "Loading Private Vault" })).toBeInTheDocument();
    expect(document.querySelectorAll("article")).toHaveLength(4);
  });
});
