import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSpaceNameEditor } from "./use-space-name-editor";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

const INITIAL_REVISION = "2026-09-05T16:00:00.000Z";

function response(status: number, body: unknown): Response {
  return { json: async () => body, ok: status >= 200 && status < 300, status } as Response;
}

describe("useSpaceNameEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trims, saves once, reconciles the canonical name, and refreshes", async () => {
    const onSaved = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        response(200, { name: "Our place", updatedAt: "2026-09-05T16:01:00.000Z" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() =>
      useSpaceNameEditor({ name: "Our space", onSaved, updatedAt: INITIAL_REVISION }),
    );

    act(() => {
      result.current.startEditing();
      result.current.updateDraft("  Our place  ");
    });
    await act(async () => {
      await Promise.all([result.current.save(), result.current.save()]);
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/spaces/name", {
      body: JSON.stringify({ expectedUpdatedAt: INITIAL_REVISION, name: "  Our place  " }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    expect(result.current.canonicalName).toBe("Our place");
    expect(result.current.draft).toBe("Our place");
    expect(result.current.isEditing).toBe(false);
    expect(onSaved).toHaveBeenCalledWith("Our place", "2026-09-05T16:01:00.000Z");
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("cancels without a request and exposes validation without discarding the draft", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() =>
      useSpaceNameEditor({ name: "Our space", onSaved: vi.fn(), updatedAt: INITIAL_REVISION }),
    );

    act(() => {
      result.current.startEditing();
      result.current.updateDraft(" ");
    });
    act(() => void result.current.save());
    expect(result.current.hasAttemptedSave).toBe(true);
    expect(result.current.draft).toBe(" ");
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => result.current.cancel());
    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe("Our space");
  });

  it("preserves the draft through conflict, accepts the current name, and retries explicitly", async () => {
    const onSaved = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(409, {
          code: "conflict",
          name: "Partner's space",
          updatedAt: "2026-09-05T16:02:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        response(200, { name: "Our retry", updatedAt: "2026-09-05T16:03:00.000Z" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() =>
      useSpaceNameEditor({ name: "Our space", onSaved, updatedAt: INITIAL_REVISION }),
    );

    act(() => {
      result.current.startEditing();
      result.current.updateDraft("Our retry");
    });
    await act(async () => result.current.save());
    expect(result.current.isConflict).toBe(true);
    expect(result.current.draft).toBe("Our retry");
    expect(result.current.canonicalName).toBe("Partner's space");

    await act(async () => result.current.save());
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({ expectedUpdatedAt: "2026-09-05T16:02:00.000Z", name: "Our retry" }),
    });
    expect(onSaved).toHaveBeenLastCalledWith("Our retry", "2026-09-05T16:03:00.000Z");
  });
});
