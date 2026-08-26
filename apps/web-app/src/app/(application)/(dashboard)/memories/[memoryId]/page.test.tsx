import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./page";

const { getMemoryDetailMock, getRelatedMemoriesMock, notFoundMock } = vi.hoisted(() => ({
  getMemoryDetailMock: vi.fn(),
  getRelatedMemoriesMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/memories/server/get-memory-detail", () => ({
  getMemoryDetail: getMemoryDetailMock,
}));
vi.mock("@/features/memories/server/get-related-memories", () => ({
  getRelatedMemories: getRelatedMemoriesMock,
}));
vi.mock("@/features/memories/pages/memory-detail", () => ({
  MemoryDetailPage: ({ memory }: { memory: { title: string } }) => <h1>{memory.title}</h1>,
}));

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";

describe("memory detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRelatedMemoriesMock.mockResolvedValue([]);
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  it("renders authorized detail on a direct server request", async () => {
    getMemoryDetailMock.mockResolvedValue({ title: "Among the flowers" });

    render(await Page({ params: Promise.resolve({ memoryId }) }));

    expect(getMemoryDetailMock).toHaveBeenCalledWith(memoryId);
    expect(getRelatedMemoriesMock).toHaveBeenCalledWith(memoryId);
    expect(screen.getByRole("heading", { name: "Among the flowers" })).toBeInTheDocument();
  });

  it("maps every unavailable result to the generic not-found boundary", async () => {
    getMemoryDetailMock.mockResolvedValue(null);

    await expect(Page({ params: Promise.resolve({ memoryId }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledOnce();
  });
});
