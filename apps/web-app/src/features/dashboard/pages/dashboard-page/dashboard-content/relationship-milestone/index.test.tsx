import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RelationshipMilestone } from ".";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("RelationshipMilestone", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 23, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["2026-07-23", "1 day together"],
    ["2026-07-22", "2 days together"],
  ])("renders the inclusive count for %s", (startDate, expected) => {
    render(<RelationshipMilestone startDate={startDate} />);

    expect(screen.getByRole("heading", { name: expected })).toBeInTheDocument();
  });

  it("recalculates at local midnight", () => {
    vi.setSystemTime(new Date(2026, 6, 23, 23, 59, 59, 500));
    render(<RelationshipMilestone startDate="2026-07-23" />);

    act(() => vi.advanceTimersByTime(500));

    expect(screen.getByRole("heading", { name: "2 days together" })).toBeInTheDocument();
  });

  it("corrects a stale count when the window regains focus", () => {
    render(<RelationshipMilestone startDate="2026-07-23" />);
    vi.setSystemTime(new Date(2026, 6, 24, 12));

    fireEvent.focus(window);

    expect(screen.getByRole("heading", { name: "2 days together" })).toBeInTheDocument();
  });

  it("recalculates when refreshed data supplies a different start date", () => {
    const { rerender } = render(<RelationshipMilestone startDate="2026-07-23" />);

    rerender(<RelationshipMilestone startDate="2026-07-20" />);

    expect(screen.getByRole("heading", { name: "4 days together" })).toBeInTheDocument();
  });

  it.each([null, "2026-02-30", "2026-07-24"])(
    "shows a retryable unavailable state for %s",
    (startDate) => {
      render(<RelationshipMilestone startDate={startDate} />);

      expect(screen.getByRole("heading", { name: "Day count unavailable" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(refreshMock).toHaveBeenCalledOnce();
    },
  );
});
