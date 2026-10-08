import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { settingsEditResponse as response, settingsReadResponse } from "./settings-test-responses";
import { useStartDateEditor } from "./use-start-date-editor";

const refreshMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());
const getMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios/api", () => ({ api: { patch: patchMock, get: getMock } }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

const INITIAL_REVISION = "2026-09-05T16:00:00.000Z";
describe("useStartDateEditor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits the browser timezone once, reconciles the canonical date, and refreshes", async () => {
    patchMock.mockResolvedValue(
      response(200, { startDate: "2025-04-28", updatedAt: "2026-09-05T16:01:00.000Z" }),
    );
    const { result } = renderHook(() =>
      useStartDateEditor({
        onSaved: vi.fn(),
        startDate: "2025-04-27",
        updatedAt: INITIAL_REVISION,
      }),
    );

    act(() => {
      result.current.startEditing();
      result.current.updateDraft("2025-04-28");
    });
    await act(async () => Promise.all([result.current.save(), result.current.save()]));

    expect(patchMock).toHaveBeenCalledOnce();
    expect(patchMock.mock.calls[0]?.[1]).toMatchObject({
      expectedUpdatedAt: INITIAL_REVISION,
      startDate: "2025-04-28",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(result.current.canonicalStartDate).toBe("2025-04-28");
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("preserves a conflicted draft, supports accept-current, and retries explicitly", async () => {
    const onSaved = vi.fn();
    getMock.mockResolvedValue(
      settingsReadResponse({ startDate: "2025-04-26", updatedAt: "2026-09-05T16:02:00.000Z" }),
    );
    patchMock
      .mockResolvedValueOnce(response(409))
      .mockResolvedValueOnce(
        response(200, { startDate: "2025-04-28", updatedAt: "2026-09-05T16:03:00.000Z" }),
      );
    const { result } = renderHook(() =>
      useStartDateEditor({ onSaved, startDate: "2025-04-27", updatedAt: INITIAL_REVISION }),
    );

    act(() => {
      result.current.startEditing();
      result.current.updateDraft("2025-04-28");
    });
    await act(async () => result.current.save());
    expect(result.current.draft).toBe("2025-04-28");
    expect(result.current.canonicalStartDate).toBe("2025-04-26");
    expect(getMock).toHaveBeenCalledWith("/users/me/settings");
    act(() => result.current.acceptCurrent());
    expect(onSaved).toHaveBeenCalledWith("2025-04-26", "2026-09-05T16:02:00.000Z");
  });
});
