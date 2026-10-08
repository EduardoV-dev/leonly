import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { settingsEditResponse as response, settingsReadResponse } from "./settings-test-responses";
import { useSpaceNameEditor } from "./use-space-name-editor";

const refreshMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());
const getMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios/api", () => ({ api: { patch: patchMock, get: getMock } }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

const INITIAL_REVISION = "2026-09-05T16:00:00.000Z";

describe("useSpaceNameEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trims, saves once, reconciles the canonical name, and refreshes", async () => {
    const onSaved = vi.fn();
    patchMock.mockResolvedValue(
      response(200, { name: "Our place", updatedAt: "2026-09-05T16:01:00.000Z" }),
    );
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

    expect(patchMock).toHaveBeenCalledOnce();
    expect(patchMock).toHaveBeenCalledWith(
      "/spaces/name",
      {
        expectedUpdatedAt: INITIAL_REVISION,
        name: "  Our place  ",
      },
      expect.objectContaining({ validateStatus: expect.any(Function) }),
    );
    expect(result.current.canonicalName).toBe("Our place");
    expect(result.current.draft).toBe("Our place");
    expect(result.current.isEditing).toBe(false);
    expect(onSaved).toHaveBeenCalledWith("Our place", "2026-09-05T16:01:00.000Z");
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("cancels without a request and exposes validation without discarding the draft", async () => {
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
    expect(patchMock).not.toHaveBeenCalled();

    act(() => result.current.cancel());
    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe("Our space");
  });

  it("preserves the draft through conflict, accepts the current name, and retries explicitly", async () => {
    const onSaved = vi.fn();
    getMock.mockResolvedValue(
      settingsReadResponse({ name: "Partner's space", updatedAt: "2026-09-05T16:02:00.000Z" }),
    );
    patchMock
      .mockResolvedValueOnce(response(409))
      .mockResolvedValueOnce(
        response(200, { name: "Our retry", updatedAt: "2026-09-05T16:03:00.000Z" }),
      );
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
    expect(getMock).toHaveBeenCalledWith("/users/me/settings");

    await act(async () => result.current.save());
    expect(patchMock.mock.calls[1]?.[1]).toMatchObject({
      expectedUpdatedAt: "2026-09-05T16:02:00.000Z",
      name: "Our retry",
    });
    expect(onSaved).toHaveBeenLastCalledWith("Our retry", "2026-09-05T16:03:00.000Z");
  });
});
