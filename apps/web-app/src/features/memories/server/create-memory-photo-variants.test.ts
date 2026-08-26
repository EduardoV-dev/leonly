import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createMemoryPhotoVariants } from "./create-memory-photo-variants";

async function createInput(width: number, height: number): Promise<ArrayBuffer> {
  const input = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 125, g: 88, b: 93 },
    },
  })
    .png()
    .toBuffer();

  return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
}

describe("createMemoryPhotoVariants", () => {
  it("preserves aspect ratio within the cover and detail bounds", async () => {
    const variants = await createMemoryPhotoVariants(await createInput(2000, 1000));

    await expect(sharp(variants.cover).metadata()).resolves.toMatchObject({
      format: "webp",
      height: 512,
      width: 1024,
    });
    await expect(sharp(variants.detail).metadata()).resolves.toMatchObject({
      format: "webp",
      height: 800,
      width: 1600,
    });
  });

  it("does not enlarge smaller images", async () => {
    const variants = await createMemoryPhotoVariants(await createInput(400, 200));

    await expect(sharp(variants.cover).metadata()).resolves.toMatchObject({
      height: 200,
      width: 400,
    });
    await expect(sharp(variants.detail).metadata()).resolves.toMatchObject({
      height: 200,
      width: 400,
    });
  });

  it("rejects bytes that cannot be decoded as an image", async () => {
    const invalidInput = new TextEncoder().encode("not an image").buffer;

    await expect(createMemoryPhotoVariants(invalidInput)).rejects.toThrow();
  });
});
