import sharp from "sharp";
import {
  IMAGE_EXTENSIONS,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
} from "../constants/uploads.constants";

type ImageContentType = keyof typeof IMAGE_EXTENSIONS;

function isImageContentType(value: unknown): value is ImageContentType {
  return typeof value === "string" && Object.hasOwn(IMAGE_EXTENSIONS, value);
}

export class InvalidImageError extends Error {}

type ValidateFinalImageParams = {
  bytes: Buffer;
  declaredMimeType: string;
  declaredByteSize: number;
};
type ValidateFinalImageReturn = { mimeType: ImageContentType; byteSize: number };

export async function validateFinalImage({
  bytes,
  declaredMimeType,
  declaredByteSize,
}: ValidateFinalImageParams): Promise<ValidateFinalImageReturn> {
  const hasInvalidByteSize =
    bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES || bytes.length !== declaredByteSize;

  if (hasInvalidByteSize) {
    throw new InvalidImageError("Image byte size does not match its descriptor");
  }

  try {
    const image = sharp(bytes, { failOn: "warning", limitInputPixels: MAX_IMAGE_PIXELS });
    const metadata = await image.metadata();
    const mimeType = `image/${metadata.format}`;
    const hasInvalidMimeType = !isImageContentType(mimeType) || mimeType !== declaredMimeType;

    if (hasInvalidMimeType) {
      throw new InvalidImageError("Image format does not match its descriptor");
    }

    await image.stats();

    return { mimeType, byteSize: bytes.length };
  } catch (error) {
    if (error instanceof InvalidImageError) throw error;
    throw new InvalidImageError("Image could not be decoded", { cause: error });
  }
}
