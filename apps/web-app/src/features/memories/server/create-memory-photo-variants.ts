import "server-only";

import sharp from "sharp";

const COVER_MAX_DIMENSION = 1024;
const DETAIL_MAX_DIMENSION = 1600;
const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_QUALITY = 85;

export type MemoryPhotoVariants = {
  cover: Buffer;
  detail: Buffer;
};

function resizeVariant(image: ReturnType<typeof sharp>, maxDimension: number): Promise<Buffer> {
  return image
    .clone()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

export async function createMemoryPhotoVariants(input: ArrayBuffer): Promise<MemoryPhotoVariants> {
  // TODO: Move variant generation to a durable background job before increasing upload limits.
  const image = sharp(Buffer.from(input), {
    failOn: "warning",
    limitInputPixels: MAX_INPUT_PIXELS,
  }).autoOrient();

  const [cover, detail] = await Promise.all([
    resizeVariant(image, COVER_MAX_DIMENSION),
    resizeVariant(image, DETAIL_MAX_DIMENSION),
  ]);

  return { cover, detail };
}
