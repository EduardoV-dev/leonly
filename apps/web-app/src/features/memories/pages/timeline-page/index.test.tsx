import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { TimelinePage } from ".";

vi.mock("../../components/memories-timeline", () => ({
  MemoriesTimeline: () => <div>Timeline memories</div>,
}));

describe("TimelinePage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders the editorial timeline heading and honest placeholder filters", () => {
    render(<TimelinePage />);

    expect(screen.getByRole("heading", { name: "Our Timeline" })).toBeInTheDocument();
    expect(
      screen.getByText("A curated collection of our shared moments, carefully preserved."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Trips" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Favorites" })).toBeDisabled();
    expect(screen.getByText("Newest First")).toBeInTheDocument();
    expect(screen.getByText("Timeline memories")).toBeInTheDocument();
  });
});
