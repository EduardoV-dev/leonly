import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServerError } from ".";

vi.mock("@/hooks/use-capture-route-error", () => ({ useCaptureRouteError: vi.fn() }));

describe("ServerError", () => {
  it("offers retry and home navigation without exposing the underlying error", () => {
    const reset = vi.fn();
    render(<ServerError error={new Error("SQL failed with secret credentials")} reset={reset} />);

    expect(screen.getByRole("heading", { name: "We couldn’t open this page" })).toBeVisible();
    expect(screen.queryByText(/secret credentials/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
  });

  it("uses Next's server retry callback when available", () => {
    const reset = vi.fn();
    const retry = vi.fn();
    render(
      <ServerError error={new Error("Server unavailable")} reset={reset} unstable_retry={retry} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(reset).not.toHaveBeenCalled();
  });
});
