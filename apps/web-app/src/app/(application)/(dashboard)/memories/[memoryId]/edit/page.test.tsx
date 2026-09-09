import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Page, { generateMetadata } from "./page";

const { getMemoryForEditingMock, notFoundMock } = vi.hoisted(() => ({
  getMemoryForEditingMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/memories/server/get-memory-for-editing", () => ({
  getMemoryForEditing: getMemoryForEditingMock,
}));
vi.mock("@/features/memories/pages/edit-memory", () => ({
  EditMemoryPage: ({ memory }: { memory: { title: string } }) => <h1>{memory.title}</h1>,
}));

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";

describe("memory edit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  it("authorizes through the placement-neutral resolver", async () => {
    getMemoryForEditingMock.mockResolvedValue({ title: "Among the flowers" });

    render(await Page({ params: Promise.resolve({ memoryId }) }));

    expect(getMemoryForEditingMock).toHaveBeenCalledWith(memoryId);
    expect(screen.getByRole("heading", { name: "Among the flowers" })).toBeInTheDocument();
  });

  it("maps every unavailable result to the generic not-found boundary", async () => {
    getMemoryForEditingMock.mockResolvedValue(null);

    await expect(Page({ params: Promise.resolve({ memoryId }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledOnce();
  });

  it("derives editing metadata from the authorized memory", async () => {
    getMemoryForEditingMock.mockResolvedValue({
      description: "A spring walk we will always remember.",
      title: "Among the flowers",
    });

    await expect(generateMetadata({ params: Promise.resolve({ memoryId }) })).resolves.toEqual({
      description: "A spring walk we will always remember.",
      title: "Edit Among the flowers",
    });
  });

  it("uses safe metadata when the memory cannot be edited", async () => {
    getMemoryForEditingMock.mockResolvedValue(null);

    await expect(generateMetadata({ params: Promise.resolve({ memoryId }) })).resolves.toEqual({
      description: "This memory is unavailable for editing.",
      title: "Memory unavailable",
    });
  });
});
