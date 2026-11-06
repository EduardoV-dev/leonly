import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Page, { generateMetadata } from "./page";

const { getCurrentMemoryDetailMock, notFoundMock } = vi.hoisted(() => ({
  getCurrentMemoryDetailMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/memories/server/get-current-memory-detail", () => ({
  getCurrentMemoryDetail: getCurrentMemoryDetailMock,
}));
vi.mock("@/features/memories/pages/memory-detail", () => ({
  MemoryDetailPage: ({ memory }: { memory: { title: string } }) => <h1>{memory.title}</h1>,
}));

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";

describe("memory detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  it("renders authorized detail on a direct server request", async () => {
    getCurrentMemoryDetailMock.mockResolvedValue({
      title: "Among the flowers",
      relatedMemories: [],
    });

    render(await Page({ params: Promise.resolve({ memoryId }) }));

    expect(getCurrentMemoryDetailMock).toHaveBeenCalledWith({ memoryId, visibility: "timeline" });
    expect(screen.getByRole("heading", { name: "Among the flowers" })).toBeInTheDocument();
  });

  it("maps every unavailable result to the generic not-found boundary", async () => {
    getCurrentMemoryDetailMock.mockResolvedValue(null);

    await expect(Page({ params: Promise.resolve({ memoryId }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledOnce();
  });

  it("derives document metadata from the authorized memory", async () => {
    getCurrentMemoryDetailMock.mockResolvedValue({
      description: "A spring walk we will always remember.",
      title: "Among the flowers",
    });

    await expect(generateMetadata({ params: Promise.resolve({ memoryId }) })).resolves.toEqual({
      description: "A spring walk we will always remember.",
      title: "Among the flowers",
    });
  });

  it("uses safe metadata when the memory is unavailable", async () => {
    getCurrentMemoryDetailMock.mockResolvedValue(null);

    await expect(generateMetadata({ params: Promise.resolve({ memoryId }) })).resolves.toEqual({
      description: "This shared memory is unavailable.",
      title: "Memory unavailable",
    });
  });
});
