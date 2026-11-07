import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/lib/i18n";
import { MemoryChronology } from ".";

const memory = {
  id: "memory-id",
  title: "Picnic",
  memoryDate: "2026-08-20",
  createdAt: "2026-08-20T00:00:00Z",
  description: null,
  location: null,
  coverPhotoUrl: null,
};

describe("MemoryChronology", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it.each(["timeline", "vault"] as const)("renders %s cards without reactions", (destination) => {
    render(<MemoryChronology destination={destination} memories={[memory]} />);
    expect(screen.getByRole("link", { name: "Open Picnic" })).toHaveAttribute(
      "href",
      destination === "vault" ? "/vault/memory-id" : "/memories/memory-id",
    );
    expect(screen.queryByRole("button", { name: /react to this memory/i })).not.toBeInTheDocument();
  });
});
