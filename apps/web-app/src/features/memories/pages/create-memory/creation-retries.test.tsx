import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { useCreateMemoryForm } from "./use-create-memory-form";

const postMock = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios/api", () => ({ api: { post: postMock } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

function renderCreationHook() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(useCreateMemoryForm, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

function createSuccessResponse() {
  return {
    data: {
      ok: true,
      error: [],
      message: "Saved",
      data: { id: "memory-id", visibility: "timeline" },
    },
  };
}

describe("creation retry identity", () => {
  beforeEach(async () => {
    postMock.mockReset();
    pushMock.mockReset();
    sessionStorage.clear();
    await i18n.changeLanguage("en");
    let sequence = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        sequence += 1;
        return `00000000-0000-4000-8000-${sequence.toString(16).padStart(12, "0")}`;
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("preserves the key and input for an in-progress retry", async () => {
    postMock
      .mockResolvedValueOnce({
        data: {
          ok: false,
          data: null,
          message: "Busy",
          error: [{ code: "CREATION_IN_PROGRESS", message: "Retry unchanged" }],
        },
      })
      .mockResolvedValueOnce(createSuccessResponse());
    const { result } = renderCreationHook();
    act(() => result.current.updateValue("title", "Our picnic"));

    await act(() => result.current.submit());
    expect(result.current.submitError).toBe(
      "This memory is still being saved. Try again without changing the details.",
    );
    act(() => result.current.updateValue("title", "Our picnic"));
    await act(() => result.current.submit());

    expect(postMock.mock.calls[0][1]).toEqual(postMock.mock.calls[1][1]);
    expect(result.current.values.title).toBe("Our picnic");
    expect(pushMock).toHaveBeenCalledWith("/timeline");
  });

  it("assigns a different key when input changes after an uncertain response", async () => {
    postMock
      .mockRejectedValueOnce(new Error("Response lost"))
      .mockResolvedValueOnce(createSuccessResponse());
    const { result } = renderCreationHook();
    act(() => result.current.updateValue("title", "Our picnic"));
    await act(() => result.current.submit());
    expect(result.current.submitError).toBe("We could not save this memory. Please try again.");
    act(() => result.current.updateValue("title", "Our changed picnic"));
    await act(() => result.current.submit());

    expect(postMock.mock.calls[0][1].idempotencyKey).not.toBe(
      postMock.mock.calls[1][1].idempotencyKey,
    );
    expect(postMock.mock.calls[1][1].title).toBe("Our changed picnic");
  });

  it("fences same-turn submissions and input changes while the request is pending", async () => {
    let completeRequest = () => {};
    postMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeRequest = () => resolve(createSuccessResponse());
        }),
    );
    const { result } = renderCreationHook();
    act(() => result.current.updateValue("title", "Our picnic"));
    let submission: Promise<void> = Promise.resolve();
    act(() => {
      submission = result.current.submit();
      void result.current.submit();
      result.current.updateValue("title", "Changed during save");
    });
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(result.current.values.title).toBe("Our picnic");
    await act(async () => {
      completeRequest();
      await submission;
    });
    await act(() => result.current.submit());
    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it("shows a recoverable error for server fields that have no visible control", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        ok: false,
        data: null,
        message: "Invalid",
        error: [{ code: "VALIDATION_ERROR", field: "timezone", message: "Invalid timezone" }],
      },
    });
    const { result } = renderCreationHook();
    await act(() => result.current.submit());

    expect(result.current.submitError).toBe("We could not save this memory. Please try again.");
    expect(result.current.isSubmitting).toBe(false);
  });
});
