import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { ConnectivityBanner } from ".";
import { RECONNECTED_DURATION_MS } from "./use-connectivity-banner";

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.useFakeTimers();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function connectionEvent(event: "online" | "offline") {
  act(() => window.dispatchEvent(new Event(event)));
}

describe("ConnectivityBanner", () => {
  it("stays hidden on initial online load and duplicate online events", () => {
    render(<ConnectivityBanner />);
    connectionEvent("online");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("announces offline status immediately when initially disconnected", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<ConnectivityBanner />);
    expect(screen.getByRole("alert")).toHaveTextContent("You're offline. Check your connection.");
    act(() => vi.advanceTimersByTime(RECONNECTED_DURATION_MS * 2));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("replaces offline feedback with a temporary reconnection message", () => {
    render(<ConnectivityBanner />);
    connectionEvent("offline");
    expect(screen.getByRole("alert")).toHaveTextContent("You're offline.");
    connectionEvent("online");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("You're back online.");
    act(() => vi.advanceTimersByTime(RECONNECTED_DURATION_MS));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not let an old reconnection timer hide a new offline message", () => {
    render(<ConnectivityBanner />);
    connectionEvent("offline");
    connectionEvent("online");
    act(() => vi.advanceTimersByTime(1_000));
    connectionEvent("offline");
    act(() => vi.advanceTimersByTime(RECONNECTED_DURATION_MS));
    expect(screen.getByRole("alert")).toHaveTextContent("You're offline.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("translates connection messages", async () => {
    render(<ConnectivityBanner />);
    connectionEvent("offline");
    await act(() => i18n.changeLanguage("es"));
    expect(screen.getByRole("alert")).toHaveTextContent("No tienes conexión.");
  });

  it("removes listeners and timers on unmount", () => {
    const removeListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<ConnectivityBanner />);
    connectionEvent("offline");
    connectionEvent("online");
    unmount();
    expect(removeListener).toHaveBeenCalledWith("offline", expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    connectionEvent("offline");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
