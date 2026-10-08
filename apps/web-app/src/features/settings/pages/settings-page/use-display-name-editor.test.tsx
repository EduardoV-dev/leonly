import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { settingsEditResponse as response, settingsReadResponse } from "./settings-test-responses";
import { getDisplayNameError, useDisplayNameEditor } from "./use-display-name-editor";

const refreshMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());
const getMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios/api", () => ({ api: { patch: patchMock, get: getMock } }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

const INITIAL_REVISION = "2026-09-05T16:00:00.000Z";
const NEXT_REVISION = "2026-09-05T16:01:00.000Z";

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
    patchMock.mockResolvedValue(
      response(200, {
        displayName: "Leo Vance",
        updatedAt: NEXT_REVISION,
      }),
    );
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

    expect(patchMock).toHaveBeenCalledOnce();
    expect(patchMock).toHaveBeenCalledWith(
      "/spaces/memberships/display-name",
      {
        displayName: "  Leo Vance  ",
        expectedUpdatedAt: INITIAL_REVISION,
      },
      expect.objectContaining({ validateStatus: expect.any(Function) }),
    );
    expect(result.current.canonicalDisplayName).toBe("Leo Vance");
    expect(result.current.draft).toBe("Leo Vance");
    expect(result.current.isEditing).toBe(false);
    expect(result.current.outcome).toBe("success");
    expect(onSaved).toHaveBeenCalledWith("Leo Vance", NEXT_REVISION);
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("preserves invalid input and cancels without sending a request", () => {
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
    expect(patchMock).not.toHaveBeenCalled();

    act(() => result.current.cancel());
    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe("Leo");
  });

  it("preserves the attempted name on failure and permits retry", async () => {
    patchMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response(200, { displayName: "Leo Retry", updatedAt: NEXT_REVISION }));
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
    expect(patchMock).toHaveBeenCalledTimes(2);
    expect(result.current.canonicalDisplayName).toBe("Leo Retry");
  });

  it("accepts the current canonical name after a conflict", async () => {
    const onSaved = vi.fn();
    patchMock.mockResolvedValue(response(409));
    getMock.mockResolvedValue(
      settingsReadResponse({ displayName: "Leo Current", updatedAt: NEXT_REVISION }),
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
    expect(getMock).toHaveBeenCalledWith("/users/me/settings");

    act(() => result.current.acceptCurrent());
    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe("Leo Current");
    expect(onSaved).toHaveBeenCalledWith("Leo Current", NEXT_REVISION);
  });

  it("retries a preserved conflict draft against the freshly read revision", async () => {
    getMock.mockResolvedValue(
      settingsReadResponse({ displayName: "Leo Current", updatedAt: NEXT_REVISION }),
    );
    patchMock.mockResolvedValueOnce(response(409)).mockResolvedValueOnce(
      response(200, {
        displayName: "Leo Attempt",
        updatedAt: "2026-09-05T16:02:00.000Z",
      }),
    );
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

    expect(patchMock.mock.calls[1]?.[1]).toMatchObject({
      displayName: "Leo Attempt",
      expectedUpdatedAt: NEXT_REVISION,
    });
  });

  it("preserves the draft when reading current settings after a conflict fails", async () => {
    patchMock.mockResolvedValueOnce(response(409));
    getMock.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() =>
      useDisplayNameEditor({ displayName: "Leo", onSaved: vi.fn(), updatedAt: INITIAL_REVISION }),
    );
    act(() => {
      result.current.startEditing();
      result.current.updateDraft("Leo Attempt");
    });
    await act(async () => result.current.save());
    expect(result.current.draft).toBe("Leo Attempt");
    expect(result.current.outcome).toBe("failed");
    expect(result.current.isSaving).toBe(false);
  });
});
