import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/lib/i18n";
import { VaultMemoryDetailPage } from ".";

const memory = {
  createdAt: "2026-08-23T10:00:00.000Z",
  creatorAvatarUrl: null,
  creatorDisplayName: "Sarah",
  description: "We found a quiet corner and stayed until sunset.",
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  location: "The botanical gardens",
  memoryDate: "2026-08-20",
  photos: [],
  title: "Among the hidden flowers",
  visibility: "vault" as const,
};

describe("VaultMemoryDetailPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("reuses the memory detail UI with Vault navigation and Vault recommendations", () => {
    render(
      <VaultMemoryDetailPage
        memory={memory}
        relatedMemories={[
          {
            coverPhotoUrl: null,
            createdAt: "2026-08-19T10:00:00.000Z",
            description: "We packed a blanket and stayed all afternoon.",
            id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
            location: "The riverbank",
            memoryDate: "2026-08-18",
            title: "Picnic by the river",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Among the hidden flowers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Private Vault" })).toHaveAttribute(
      "href",
      "/vault",
    );
    expect(screen.getByRole("heading", { name: "More from the Vault" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Picnic by the river" })).toHaveAttribute(
      "href",
      "/vault/2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
    );
  });
});
