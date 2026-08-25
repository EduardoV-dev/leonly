import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemorySummaryCard } from ".";

const memory = {
  coverPhotoUrl: null,
  createdAt: "2026-08-23T10:00:00.000Z",
  description: "A sunny afternoon together",
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  location: "The park",
  memoryDate: "2026-08-20",
  title: "Our picnic",
};

describe("MemorySummaryCard", () => {
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
    expect(screen.getByText("A sunny afternoon together")).toBeInTheDocument();
    expect(screen.getByText("The park")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "No cover photo available" })).toBeInTheDocument();
  });

  it("keeps an unbroken location value in a dedicated text element", () => {
    const location = "averylonglocationwithoutanynaturalbreakpoints";

    render(<MemorySummaryCard memory={{ ...memory, location }} />);

    expect(screen.getByText(location).tagName).toBe("SPAN");
  });
});
