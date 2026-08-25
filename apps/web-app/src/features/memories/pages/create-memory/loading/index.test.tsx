import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreateMemoryLoading } from ".";

describe("CreateMemoryLoading", () => {
  it("renders a responsive new-memory form skeleton", () => {
    render(<CreateMemoryLoading />);

    expect(screen.getByLabelText("Loading new memory form")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-slot=skeleton]")).not.toHaveLength(0);
  });
});
