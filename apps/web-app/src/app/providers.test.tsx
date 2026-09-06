import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";

const initializeLanguageMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/i18n")>()),
  initializeLanguage: initializeLanguageMock,
}));

describe("Providers", () => {
  beforeEach(() => {
    initializeLanguageMock.mockReset();
  });

  it("waits for browser language initialization before revealing children", async () => {
    let resolveInitialization!: () => void;
    initializeLanguageMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveInitialization = resolve;
      }),
    );

    render(
      <Providers>
        <p>Language-dependent content</p>
      </Providers>,
    );

    expect(screen.getByRole("status", { name: "Loading application" })).toBeInTheDocument();
    expect(screen.queryByText("Language-dependent content")).not.toBeInTheDocument();

    await act(async () => {
      resolveInitialization();
    });

    expect(screen.getByText("Language-dependent content")).toBeInTheDocument();
  });
});
