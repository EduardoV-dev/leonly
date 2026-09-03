import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { VaultMemoryDetailPage } from ".";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../../components/memory-comments", () => ({
  MemoryComments: () => <p>Comments</p>,
}));
vi.mock("../../components/memory-reactions", () => ({
  MemoryReactions: () => <p>Reactions</p>,
}));

const memory = {
  createdAt: "2026-08-23T10:00:00.000Z",
  creatorAvatarUrl: null,
  creatorDisplayName: "Sarah",
  description: "We found a quiet corner and stayed until sunset.",
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  location: "The botanical gardens",
  memoryDate: "2026-08-20",
  reaction: {
    counts: { cry: 0, heart: 0, laugh: 0, star: 0 },
    currentReaction: null,
    members: { cry: [], heart: [], laugh: [], star: [] },
  },
  photos: [],
  title: "Among the hidden flowers",
  version: "MjAyNi0wOC0yM1QxMDowMDowMC4wMDBa",
  visibility: "vault" as const,
};

describe("VaultMemoryDetailPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("reuses the memory detail UI with Vault navigation and Vault recommendations", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <VaultMemoryDetailPage
          memory={memory}
          relatedMemories={[
            {
              commentCount: 0,
              coverPhotoUrl: null,
              createdAt: "2026-08-19T10:00:00.000Z",
              description: "We packed a blanket and stayed all afternoon.",
              id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
              location: "The riverbank",
              memoryDate: "2026-08-18",
              title: "Picnic by the river",
            },
          ]}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Among the hidden flowers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Private Vault" })).toHaveAttribute(
      "href",
      "/vault",
    );
    expect(screen.getByRole("heading", { name: "More from the Vault" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/memories/${memory.id}/edit`,
    );
    expect(screen.getByRole("button", { name: "Move to Timeline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove memory" })).toBeInTheDocument();
    expect(document.querySelector('[data-detail-footer="true"]')).toHaveTextContent(
      "Preserved by Sarah",
    );
    expect(screen.getByRole("link", { name: "Open Picnic by the river" })).toHaveAttribute(
      "href",
      "/vault/2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
    );
  });
});
