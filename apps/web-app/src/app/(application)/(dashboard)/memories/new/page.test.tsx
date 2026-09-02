import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Page from "./page";

vi.mock("@/features/memories/pages/create-memory", () => ({
  CreateMemoryPage: () => <h1>Preserve a Moment</h1>,
}));

describe("new memory route", () => {
  it("renders creation at the placement-neutral route", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: "Preserve a Moment" })).toBeInTheDocument();
  });
});
