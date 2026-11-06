import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { MemoryDetailPage } from ".";
import { MemoryDetailError } from "./error";
import { MemoryDetailLoading } from "./loading";
import { MemoryDetailNotFound } from "./not-found";

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
  creatorAvatarUrl: "https://avatars.example/sarah.jpg",
  creatorDisplayName: "Sarah",
  description: "We found a quiet corner and stayed until sunset.",
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  location: "The botanical gardens",
  memoryDate: "2026-08-20",
  relatedMemories: [],
  reaction: {
    counts: { cry: 0, heart: 0, laugh: 0, star: 0 },
    currentReaction: null,
    members: { cry: [], heart: [], laugh: [], star: [] },
  },
  photos: [
    {
      coverUrl: "https://storage.example/cover-card",
      detailUrl: "https://storage.example/cover-detail",
      id: "64d44f34-c5fe-482a-b65b-f91d0173b7fe",
    },
  ],
  title: "Among the flowers",
  updatedAt: "2026-08-24T14:30:00.000Z",
  version: "MjAyNi0wOC0yM1QxMDowMDowMC4wMDBa",
  visibility: "timeline" as const,
};

function renderDetail(content: ReactNode) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{content}</QueryClientProvider>);
}

describe("MemoryDetailPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders the complete editorial story without redundant timeline visibility", () => {
    renderDetail(<MemoryDetailPage memory={memory} />);

    expect(screen.getByRole("heading", { name: "Among the flowers" })).toBeInTheDocument();
    expect(screen.getByText("August 20, 2026")).toBeInTheDocument();
    expect(screen.getByText("The botanical gardens")).toBeInTheDocument();
    expect(screen.getByText(memory.description)).toBeInTheDocument();
    expect(screen.getByText("Preserved by Sarah")).toBeInTheDocument();
    expect(screen.getByText("August 23, 2026")).toHaveAttribute("datetime", memory.createdAt);
    expect(screen.getByText("August 24, 2026")).toHaveAttribute("datetime", memory.updatedAt);
    expect(screen.getByRole("img", { name: "Sarah" })).toHaveAttribute(
      "src",
      "https://avatars.example/sarah.jpg",
    );
    expect(screen.queryByText("Shared memory")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "More from our story" })).toBeInTheDocument();
    expect(
      screen.getByText("More shared moments will appear here as your timeline grows."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to timeline" })).toHaveAttribute(
      "href",
      "/timeline",
    );
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move to Private Vault" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove memory" })).not.toBeInTheDocument();
    expect(screen.queryByText("Comments")).not.toBeInTheDocument();
    expect(screen.queryByText("Reactions")).not.toBeInTheDocument();
  });

  it("renders related memories as accessible detail links", () => {
    renderDetail(
      <MemoryDetailPage
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

    expect(screen.getByRole("link", { name: "Open Picnic by the river" })).toHaveAttribute(
      "href",
      "/memories/2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
    );
    expect(screen.getByText("We packed a blanket and stayed all afternoon.")).toBeInTheDocument();
  });

  it("omits absent optional metadata", () => {
    renderDetail(
      <MemoryDetailPage
        memory={{ ...memory, description: null, location: null, visibility: "vault" }}
      />,
    );

    expect(screen.queryByText(memory.description)).not.toBeInTheDocument();
    expect(screen.queryByText(memory.location)).not.toBeInTheDocument();
    expect(screen.getByText("Private vault")).toBeInTheDocument();
  });

  it("omits the update sentence when the memory has not changed since creation", () => {
    renderDetail(<MemoryDetailPage memory={{ ...memory, updatedAt: memory.createdAt }} />);

    expect(screen.getByText("Memory created on", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("Memory last updated on", { exact: false })).not.toBeInTheDocument();
  });

  it("renders localized route states and retries recoverable errors", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<MemoryDetailError onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<MemoryDetailNotFound />);
    expect(
      screen.getByRole("heading", { name: "This story cannot be opened" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to timeline" })).toHaveAttribute(
      "href",
      "/timeline",
    );

    rerender(<MemoryDetailLoading />);
    expect(screen.getByRole("status", { name: "Loading memory…" })).toBeInTheDocument();
  });

  it("keeps localized detail read-only", async () => {
    await i18n.changeLanguage("es");
    renderDetail(<MemoryDetailPage memory={memory} />);

    expect(screen.queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mover a la bóveda privada" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar recuerdo" })).not.toBeInTheDocument();
    expect(screen.getByText("Recuerdo creado el", { exact: false })).toBeInTheDocument();
    expect(
      screen.getByText("Última actualización del recuerdo el", { exact: false }),
    ).toBeInTheDocument();
  });
});
