import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const getVaultPageMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/memories/server/get-vault-page", () => ({
  getVaultPage: getVaultPageMock,
}));

describe("GET /api/memories/vault", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes only the opaque cursor and returns the authorized Vault page", async () => {
    const page = { cursorReset: false, memories: [], nextCursor: null };
    getVaultPageMock.mockResolvedValue(page);

    const response = await GET(new Request("http://localhost/api/memories/vault?cursor=opaque"));

    expect(getVaultPageMock).toHaveBeenCalledWith("opaque");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(page);
  });

  it("bounds oversized cursor input while preserving reset semantics", async () => {
    getVaultPageMock.mockResolvedValue({ cursorReset: true, memories: [], nextCursor: null });

    await GET(new Request(`http://localhost/api/memories/vault?cursor=${"a".repeat(513)}`));

    expect(getVaultPageMock).toHaveBeenCalledWith("invalid");
  });

  it("returns a generic retryable error when the Vault query fails", async () => {
    getVaultPageMock.mockRejectedValue(new Error("database details"));

    const response = await GET(new Request("http://localhost/api/memories/vault"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "We could not load the Private Vault. Please try again.",
    });
  });
});
