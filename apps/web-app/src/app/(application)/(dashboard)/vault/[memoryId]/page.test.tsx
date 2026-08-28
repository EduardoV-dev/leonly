import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./page";

const { getRelatedVaultMemoriesMock, getVaultMemoryDetailMock, notFoundMock } = vi.hoisted(() => ({
  getRelatedVaultMemoriesMock: vi.fn(),
  getVaultMemoryDetailMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/memories/server/get-related-vault-memories", () => ({
  getRelatedVaultMemories: getRelatedVaultMemoriesMock,
}));
vi.mock("@/features/memories/server/get-vault-memory-detail", () => ({
  getVaultMemoryDetail: getVaultMemoryDetailMock,
}));
vi.mock("@/features/memories/pages/vault-memory-detail", () => ({
  VaultMemoryDetailPage: ({ memory }: { memory: { title: string } }) => <h1>{memory.title}</h1>,
}));

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";

describe("Vault memory detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRelatedVaultMemoriesMock.mockResolvedValue([]);
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  it("renders the Vault detail page with Vault recommendations on a direct request", async () => {
    getVaultMemoryDetailMock.mockResolvedValue({ title: "Among the hidden flowers" });

    render(await Page({ params: Promise.resolve({ memoryId }) }));

    expect(getVaultMemoryDetailMock).toHaveBeenCalledWith(memoryId);
    expect(getRelatedVaultMemoriesMock).toHaveBeenCalledWith(memoryId);
    expect(screen.getByRole("heading", { name: "Among the hidden flowers" })).toBeInTheDocument();
  });

  it("maps unavailable or non-Vault results to the generic not-found boundary", async () => {
    getVaultMemoryDetailMock.mockResolvedValue(null);

    await expect(Page({ params: Promise.resolve({ memoryId }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledOnce();
  });
});
