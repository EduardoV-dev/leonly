import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimelineLoading } from ".";

describe("TimelineLoading", () => {
  it("renders timeline controls and full memory-card placeholders", () => {
    render(<TimelineLoading />);

    expect(screen.getByLabelText("Loading timeline")).toBeInTheDocument();
    expect(document.querySelectorAll("article")).toHaveLength(3);
  });
});
