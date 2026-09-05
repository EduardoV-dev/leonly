import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDisplayNameError, useDisplayNameEditor } from "./use-display-name-editor";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

const INITIAL_REVISION = "2026-09-05T16:00:00.000Z";
const NEXT_REVISION = "2026-09-05T16:01:00.000Z";

function response(status: number, body: unknown): Response {
  return { json: async () => body, ok: status >= 200 && status < 300, status } as Response;
}

describe("useDisplayNameEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates the inclusive 2-100 Unicode-character boundaries after trimming", () => {
    expect(getDisplayNameError(" a ")).toBe("length");
    expect(getDisplayNameError(" 😀😀 ")).toBeNull();
    expect(getDisplayNameError(` ${"😀".repeat(100)} `)).toBeNull();
    expect(getDisplayNameError("😀".repeat(101))).toBe("length");
  });

  it("preserves padded input, saves once, and adopts the trimmed canonical response", async () => {
    const onSaved = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      response(200, {
        displayName: "Leo Vance",
        updatedAt: NEXT_REVISION,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() =>
      useDisplayNameEditor({
        displayName: "Leo",
        onSaved,
        updatedAt: INITIAL_REVISION,
      }),
    );

    act(() => {
      result.current.startEditing();
      result.current.updateDraft("  Leo Vance  ");
    });
    await act(async () => {
      await Promise.all([result.current.save(), result.current.save()]);
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/membership/display-name", {
      body: JSON.stringify({
        displayName: "  Leo Vance  ",
        expectedUpdatedAt: INITIAL_REVISION,
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    expect(result.current.canonicalDisplayName).toBe("Leo Vance");
    expect(result.current.draft).toBe("Leo Vance");
    expect(result.current.isEditing).toBe(false);
    expect(result.current.outcome).toBe("success");
    expect(onSaved).toHaveBeenCalledWith("Leo Vance", NEXT_REVISION);
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("preserves invalid input and cancels without sending a request", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() =>
      useDisplayNameEditor({
        displayName: "Leo",
        onSaved: vi.fn(),
        updatedAt: INITIAL_REVISION,
      }),
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
    expect(result.current.draft).toBe("Leo");
  });

  it("preserves the attempted name on failure and permits retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response(200, { displayName: "Leo Retry", updatedAt: NEXT_REVISION }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() =>
      useDisplayNameEditor({
        displayName: "Leo",
        onSaved: vi.fn(),
        updatedAt: INITIAL_REVISION,
      }),
    );

    act(() => {
      result.current.startEditing();
      result.current.updateDraft("Leo Retry");
    });
    await act(async () => result.current.save());

    expect(result.current.outcome).toBe("failed");
    expect(result.current.draft).toBe("Leo Retry");
    expect(result.current.isEditing).toBe(true);

    await act(async () => result.current.save());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.canonicalDisplayName).toBe("Leo Retry");
  });

  it("accepts the current canonical name after a conflict", async () => {
    const onSaved = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(409, {
          code: "conflict",
          displayName: "Leo Current",
          updatedAt: NEXT_REVISION,
        }),
      ),
    );
    const { result } = renderHook(() =>
      useDisplayNameEditor({ displayName: "Leo", onSaved, updatedAt: INITIAL_REVISION }),
    );

    act(() => {
      result.current.startEditing();
      result.current.updateDraft("Leo Attempt");
    });
    await act(async () => result.current.save());
    expect(result.current.draft).toBe("Leo Attempt");
    expect(result.current.canonicalDisplayName).toBe("Leo Current");

    act(() => result.current.acceptCurrent());
    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe("Leo Current");
    expect(onSaved).toHaveBeenCalledWith("Leo Current", NEXT_REVISION);
  });

  it("retries a preserved conflict draft against the returned revision", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(409, {
          code: "conflict",
          displayName: "Leo Current",
          updatedAt: NEXT_REVISION,
        }),
      )
      .mockResolvedValueOnce(
        response(200, {
          displayName: "Leo Attempt",
          updatedAt: "2026-09-05T16:02:00.000Z",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() =>
      useDisplayNameEditor({
        displayName: "Leo",
        onSaved: vi.fn(),
        updatedAt: INITIAL_REVISION,
      }),
    );

    act(() => {
      result.current.startEditing();
      result.current.updateDraft("Leo Attempt");
    });
    await act(async () => result.current.save());
    await act(async () => result.current.save());

    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({ displayName: "Leo Attempt", expectedUpdatedAt: NEXT_REVISION }),
    });
  });
});
