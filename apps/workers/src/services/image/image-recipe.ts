import sharp from "sharp";

export const MAX_ORIGINAL_BYTES = 5_242_880;
export const MAX_VARIANT_BYTES = 10_485_760;
export const MAX_INPUT_PIXELS = 40_000_000;
export const VARIANT_DIMENSIONS = { cover: 1024, detail: 1600 } as const;
const MIMETYPE = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export type Variant = keyof typeof VARIANT_DIMENSIONS;

export class ImageProcessingError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export async function validateOriginal(
  bytes: Buffer,
  expected: { mimeType: string; byteSize: number },
): Promise<void> {
  if (bytes.length !== expected.byteSize || bytes.length > MAX_ORIGINAL_BYTES)
    throw new ImageProcessingError("ORIGINAL_METADATA_MISMATCH");

  try {
    const image = sharp(bytes, { failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS });
    const metadata = await image.metadata();
    const mimeType = MIMETYPE[metadata.format as keyof typeof MIMETYPE];

    if (mimeType !== expected.mimeType || (metadata.pages ?? 1) > 1)
      throw new ImageProcessingError("INVALID_ORIGINAL");

    await image.clone().raw().toBuffer();
  } catch (error) {
    if (error instanceof ImageProcessingError) throw error;
    throw new ImageProcessingError("INVALID_ORIGINAL");
  }
}

export async function generateVariant(bytes: Buffer, variant: Variant): Promise<Buffer> {
  try {
    return await sharp(bytes, { failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS })
      .autoOrient()
      .resize({
        width: VARIANT_DIMENSIONS[variant],
        height: VARIANT_DIMENSIONS[variant],
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ImageProcessingError("INVALID_ORIGINAL");
  }
}

export async function verifyVariant(options: {
  bytes: Buffer;
  generated: Buffer;
  variant: Variant;
}): Promise<void> {
  const { bytes, generated, variant } = options;

  if (!bytes.equals(generated) || bytes.length === 0 || bytes.length > MAX_VARIANT_BYTES)
    throw new ImageProcessingError("VARIANT_CONTENT_CONFLICT");

  const metadata = await sharp(bytes, {
    failOn: "warning",
    limitInputPixels: MAX_INPUT_PIXELS,
  }).metadata();

  if (
    metadata.format !== "webp" ||
    !metadata.width ||
    !metadata.height ||
    metadata.width > VARIANT_DIMENSIONS[variant] ||
    metadata.height > VARIANT_DIMENSIONS[variant]
  )
    throw new ImageProcessingError("INVALID_VARIANT");
}
