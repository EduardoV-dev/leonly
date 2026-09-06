import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/lib/i18n";
import { TimelineLoading } from ".";

describe("TimelineLoading", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders timeline controls and full memory-card placeholders", () => {
    render(<TimelineLoading />);

    expect(screen.getByLabelText("Loading timeline")).toBeInTheDocument();
    expect(document.querySelectorAll("article")).toHaveLength(3);
  });
});
