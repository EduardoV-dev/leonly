import { fireEvent, render, screen } from "@testing-library/react";
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

  it("renders an accessible working sort control without category tags", () => {
    render(<TimelinePage />);

    expect(screen.getByRole("heading", { name: "Our Timeline" })).toBeInTheDocument();
    expect(
      screen.getByText("A curated collection of our shared moments, carefully preserved."),
    ).toBeInTheDocument();
    const sort = screen.getByLabelText("Sort by:");
    expect(sort).toHaveValue("newest");
    expect(screen.queryByRole("button", { name: "Trips" })).not.toBeInTheDocument();
    fireEvent.change(sort, { target: { value: "oldest" } });
    expect(sort).toHaveValue("oldest");
    expect(screen.getByText("Timeline memories")).toBeInTheDocument();
  });
});
