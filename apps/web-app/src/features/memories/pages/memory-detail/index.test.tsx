import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { MemoryDetailPage } from ".";
import { MemoryDetailError } from "./error";
import { MemoryDetailLoading } from "./loading";
import { MemoryDetailNotFound } from "./not-found";

const memory = {
  createdAt: "2026-08-23T10:00:00.000Z",
  creatorDisplayName: "Sarah",
  description: "We found a quiet corner and stayed until sunset.",
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  location: "The botanical gardens",
  memoryDate: "2026-08-20",
  photos: [{ id: "64d44f34-c5fe-482a-b65b-f91d0173b7fe", url: "https://storage.example/cover" }],
  title: "Among the flowers",
  visibility: "timeline" as const,
};

describe("MemoryDetailPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders the complete editorial story and timeline visibility", () => {
    render(<MemoryDetailPage memory={memory} />);

    expect(screen.getByRole("heading", { name: "Among the flowers" })).toBeInTheDocument();
    expect(screen.getByText("August 20, 2026")).toBeInTheDocument();
    expect(screen.getByText("The botanical gardens")).toBeInTheDocument();
    expect(screen.getByText(memory.description)).toBeInTheDocument();
    expect(screen.getByText("Preserved by Sarah")).toBeInTheDocument();
    expect(screen.getByText("Shared memory")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to timeline" })).toHaveAttribute(
      "href",
      "/timeline",
    );
    expect(document.querySelector("[data-extension-region]")).not.toBeInTheDocument();
  });

  it("omits absent optional metadata and composes visibility-aware extension content", () => {
    render(
      <MemoryDetailPage
        memory={{ ...memory, description: null, location: null, visibility: "vault" }}
        actions={<button type="button">Restore</button>}
        comments={<p>Comments</p>}
        reactions={<button type="button">React</button>}
      />,
    );

    expect(screen.queryByText(memory.description)).not.toBeInTheDocument();
    expect(screen.queryByText(memory.location)).not.toBeInTheDocument();
    expect(screen.getByText("Private vault")).toBeInTheDocument();
    expect(document.querySelector('[data-extension-region="memory-actions"]')).toHaveAttribute(
      "data-visibility",
      "vault",
    );
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "React" })).toBeInTheDocument();
    expect(screen.getByText("Comments")).toBeInTheDocument();
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
});
