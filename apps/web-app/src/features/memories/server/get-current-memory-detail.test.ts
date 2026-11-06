import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentMemoryDetail } from "./get-current-memory-detail";

const { get, getHeaders, redirect } = vi.hoisted(() => ({
  get: vi.fn(),
  getHeaders: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: getHeaders }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/axios/server-api", () => ({
  serverApi: { get },
  isAxiosError: (error: object) => "response" in error,
}));

describe("getCurrentMemoryDetail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getHeaders.mockResolvedValue(new Headers({ cookie: "session=private" }));
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("forwards the session cookie for the selected route", async () => {
    get.mockResolvedValue({ data: { ok: true, data: { title: "A memory" } } });
    await expect(
      getCurrentMemoryDetail({ memoryId: "memory-id", visibility: "vault" }),
    ).resolves.toEqual({
      title: "A memory",
    });
    expect(get).toHaveBeenCalledWith("/memories/vault/memory-id", {
      headers: { cookie: "session=private" },
    });
  });

  it("distinguishes unavailable, unauthenticated and unexpected failures", async () => {
    get.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(
      getCurrentMemoryDetail({ memoryId: "missing", visibility: "timeline" }),
    ).resolves.toBeNull();
    get.mockRejectedValueOnce({ response: { status: 401 } });
    await expect(
      getCurrentMemoryDetail({ memoryId: "unauthenticated", visibility: "timeline" }),
    ).rejects.toThrow("NEXT_REDIRECT");
    get.mockRejectedValueOnce(new Error("network"));
    await expect(
      getCurrentMemoryDetail({ memoryId: "error", visibility: "timeline" }),
    ).rejects.toThrow("Failed to load memory detail.");
  });
});
