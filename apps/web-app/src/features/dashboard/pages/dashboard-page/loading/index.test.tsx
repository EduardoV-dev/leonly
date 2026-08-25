import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardLoading } from ".";

describe("DashboardLoading", () => {
  it("renders only the dashboard content skeleton", () => {
    const { container } = render(<DashboardLoading />);

    expect(screen.getByLabelText("Loading dashboard")).toBeInTheDocument();
    expect(container.querySelector("aside")).not.toBeInTheDocument();
  });
});
