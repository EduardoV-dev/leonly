import sharp from "sharp";
import { requireObject, throwInputValidationError } from "../../../common/utils/input-validation";

export const MAX_IMAGE_COUNT = 10;
export const MAX_IMAGE_BYTES = 5_242_880;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const ATTACHMENT_SECONDS = 4_200;
export const FINALIZATION_LEASE_SECONDS = 120;

const IMAGE_EXTENSIONS = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
} as const;

export type ImageContentType = keyof typeof IMAGE_EXTENSIONS;
export type UploadDescriptor = {
  filename: string;
  contentType: ImageContentType;
  byteSize: number;
};

function isImageContentType(value: unknown): value is ImageContentType {
  return typeof value === "string" && Object.hasOwn(IMAGE_EXTENSIONS, value);
}

export function validateUploadRequest(value: unknown): UploadDescriptor[] {
  const request = requireObject({ value, allowedFields: ["purpose", "files"] });

  if (request.purpose !== "memory_image")
    throwInputValidationError({ field: "purpose", message: "Choose a supported upload purpose." });

  const { files } = request;
  const hasInvalidFileCount =
    !Array.isArray(files) || files.length < 1 || files.length > MAX_IMAGE_COUNT;

  if (hasInvalidFileCount) {
    throwInputValidationError({ field: "files", message: "Choose between 1 and 10 photos." });
  }

  return files.map((value, index) => {
    const field = `files.${index}`;
    const descriptor = requireObject({
      value,
      allowedFields: ["filename", "contentType", "byteSize"],
    });
    const { filename, contentType, byteSize } = descriptor;

    if (!isImageContentType(contentType))
      throwInputValidationError({
        field: `${field}.contentType`,
        message: "Use JPEG, PNG, or WebP.",
      });

    const hasInvalidFilename =
      typeof filename !== "string" || filename.length === 0 || /[\p{Cc}/\\]/u.test(filename);

    if (hasInvalidFilename) {
      throwInputValidationError({
        field: `${field}.filename`,
        message: "Provide a photo filename without paths or control characters.",
      });
    }

    const extension = filename.split(".").at(-1)?.toLowerCase();
    const extensions: readonly string[] = IMAGE_EXTENSIONS[contentType];
    const hasInvalidExtension =
      !extension || filename.toLowerCase() === extension || !extensions.includes(extension);

    if (hasInvalidExtension) {
      throwInputValidationError({
        field: `${field}.filename`,
        message: "The filename extension must match the image type.",
      });
    }

    const hasInvalidByteSize =
      typeof byteSize !== "number" ||
      !Number.isInteger(byteSize) ||
      byteSize < 1 ||
      byteSize > MAX_IMAGE_BYTES;

    if (hasInvalidByteSize) {
      throwInputValidationError({
        field: `${field}.byteSize`,
        message: "Each photo must contain between 1 byte and 5 MB.",
      });
    }

    return { filename, contentType, byteSize };
  });
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
