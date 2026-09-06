import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/lib/i18n";
import { DashboardLoading } from ".";

describe("DashboardLoading", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders only the dashboard content skeleton", () => {
    const { container } = render(<DashboardLoading />);

    expect(screen.getByLabelText("Loading dashboard")).toBeInTheDocument();
    expect(container.querySelector("aside")).not.toBeInTheDocument();
  });
});
