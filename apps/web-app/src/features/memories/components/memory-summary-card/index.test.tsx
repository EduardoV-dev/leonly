import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/lib/i18n";
import { MemorySummaryCard } from ".";

const memory = {
  commentCount: 3,
  coverPhotoUrl: null,
  createdAt: "2026-08-23T10:00:00.000Z",
  description: "A sunny afternoon together",
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  location: "The park",
  memoryDate: "2026-08-20",
  title: "Our picnic",
};

describe("MemorySummaryCard", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("links its complete summary while keeping extension actions independent", () => {
    render(
      <MemorySummaryCard
        memory={memory}
        count={<span>3 photos</span>}
        actions={<button type="button">More actions</button>}
      />,
    );

    const detailLink = screen.getByRole("link", { name: "Open Our picnic" });
    const action = screen.getByRole("button", { name: "More actions" });

    expect(detailLink).toHaveAttribute("href", `/memories/${memory.id}`);
    expect(detailLink).toContainElement(screen.getByRole("heading", { name: "Our picnic" }));
    expect(detailLink).not.toContainElement(action);
    expect(screen.getByText("3 photos")).toBeInTheDocument();
    expect(screen.getByText("3 comments")).toBeInTheDocument();
    expect(screen.getByText("A sunny afternoon together")).toBeInTheDocument();
    expect(screen.getByText("The park")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "No cover photo available" })).toBeInTheDocument();
  });

  it("keeps an unbroken location value in a dedicated text element", () => {
    const location = "averylonglocationwithoutanynaturalbreakpoints";

    render(<MemorySummaryCard memory={{ ...memory, location }} />);

    expect(screen.getByText(location).tagName).toBe("SPAN");
  });

  it.each(["timeline", "recent", "related", "vault"] as const)(
    "does not expose deletion on the %s summary surface",
    (variant) => {
      render(<MemorySummaryCard memory={memory} variant={variant} />);

      expect(screen.queryByRole("button", { name: "Remove memory" })).not.toBeInTheDocument();
    },
  );

  it("requests the authorized route directly and preserves its fallback on failure", () => {
    const coverPhotoUrl = `/api/memories/${memory.id}/photos/22a6c4ed-10c7-42a9-a7a8-b31d210ea2bf/cover`;
    render(<MemorySummaryCard memory={{ ...memory, coverPhotoUrl }} />);

    const cover = screen.getByRole("img", { name: "Cover for Our picnic" });
    expect(cover).toHaveAttribute("src", coverPhotoUrl);
    expect(cover).not.toHaveAttribute("src", expect.stringContaining("/_next/image"));

    fireEvent.error(cover);
    expect(screen.getByRole("img", { name: "No cover photo available" })).toBeInTheDocument();
  });
});
