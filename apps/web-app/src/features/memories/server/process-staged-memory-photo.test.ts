import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createAdminClientMock, createVariantsMock } = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  createVariantsMock: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));
vi.mock("./create-memory-photo-variants", () => ({
  createMemoryPhotoVariants: createVariantsMock,
}));

import { processStagedMemoryPhoto } from "./process-staged-memory-photo";

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC",
  "base64",
);

describe("processStagedMemoryPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createVariantsMock.mockResolvedValue({
      cover: Buffer.from("cover"),
      detail: Buffer.from("detail"),
    });
  });

  it("validates a private original and stores only generated variants", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const download = vi.fn().mockResolvedValue({
      data: { arrayBuffer: async () => Uint8Array.from(PNG_BYTES).buffer },
      error: null,
    });
    createAdminClientMock.mockReturnValue({
      storage: { from: vi.fn(() => ({ download, upload })) },
    });
    const markUploaded = vi.fn().mockResolvedValue(undefined);

    await processStagedMemoryPhoto(
      {
        coverPath: "space/attempt/photo/cover.webp",
        detailPath: "space/attempt/photo/detail.webp",
        id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
        name: "memory.png",
        originalPath: "space/attempt/photo/original",
      },
      markUploaded,
    );

    expect(download).toHaveBeenCalledWith("space/attempt/photo/original");
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenNthCalledWith(
      1,
      "space/attempt/photo/cover.webp",
      Buffer.from("cover"),
      { contentType: "image/webp", upsert: true },
    );
    expect(markUploaded).toHaveBeenCalledOnce();
  });

  it("rejects spoofed bytes before generating or persisting variants", async () => {
    const upload = vi.fn();
    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          download: vi.fn().mockResolvedValue({
            data: { arrayBuffer: async () => new TextEncoder().encode("not an image").buffer },
            error: null,
          }),
          upload,
        })),
      },
    });
    const markUploaded = vi.fn();

    await expect(
      processStagedMemoryPhoto(
        {
          coverPath: "cover",
          detailPath: "detail",
          id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
          name: "spoofed.png",
          originalPath: "original",
        },
        markUploaded,
      ),
    ).rejects.toMatchObject({ fields: { photos: "Photos must be JPEG, PNG, or WebP images." } });
    expect(upload).not.toHaveBeenCalled();
    expect(markUploaded).not.toHaveBeenCalled();
  });
});
