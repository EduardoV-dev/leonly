import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/lib/i18n";
import { CreateMemoryLoading } from ".";

describe("CreateMemoryLoading", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders a responsive new-memory form skeleton", () => {
    render(<CreateMemoryLoading />);

    expect(screen.getByLabelText("Loading new memory form")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-slot=skeleton]")).not.toHaveLength(0);
  });
});
