import { BadRequestException } from "@nestjs/common";
import sharp from "sharp";

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

export function invalidInput(field: string, message: string): never {
  throw new BadRequestException({ errors: [{ code: "VALIDATION_ERROR", field, message }] });
}

export function requireObject(
  value: unknown,
  allowedFields: readonly string[],
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalidInput("body", "Provide a JSON object.");
  }
  const record = value as Record<string, unknown>;
  const forbiddenField = Object.keys(record).find((field) => !allowedFields.includes(field));
  if (forbiddenField) invalidInput(forbiddenField, "This field is not accepted.");
  return record;
}

function isImageContentType(value: unknown): value is ImageContentType {
  return typeof value === "string" && Object.hasOwn(IMAGE_EXTENSIONS, value);
}

export function validateUploadRequest(value: unknown): UploadDescriptor[] {
  const request = requireObject(value, ["purpose", "files"]);
  if (request.purpose !== "memory_image")
    invalidInput("purpose", "Choose a supported upload purpose.");
  if (
    !Array.isArray(request.files) ||
    request.files.length < 1 ||
    request.files.length > MAX_IMAGE_COUNT
  ) {
    invalidInput("files", "Choose between 1 and 10 photos.");
  }
  return request.files.map((value, index) => {
    const field = `files.${index}`;
    const descriptor = requireObject(value, ["filename", "contentType", "byteSize"]);
    const { filename, contentType, byteSize } = descriptor;
    if (!isImageContentType(contentType))
      invalidInput(`${field}.contentType`, "Use JPEG, PNG, or WebP.");
    if (typeof filename !== "string" || filename.length === 0 || /[\p{Cc}/\\]/u.test(filename)) {
      invalidInput(
        `${field}.filename`,
        "Provide a photo filename without paths or control characters.",
      );
    }
    const extension = filename.split(".").at(-1)?.toLowerCase();
    const extensions: readonly string[] = IMAGE_EXTENSIONS[contentType];
    if (!extension || filename.toLowerCase() === extension || !extensions.includes(extension)) {
      invalidInput(`${field}.filename`, "The filename extension must match the image type.");
    }
    if (
      typeof byteSize !== "number" ||
      !Number.isInteger(byteSize) ||
      byteSize < 1 ||
      byteSize > MAX_IMAGE_BYTES
    ) {
      invalidInput(`${field}.byteSize`, "Each photo must contain between 1 byte and 5 MB.");
    }
    return { filename, contentType, byteSize };
  });
}

export class InvalidImageError extends Error {}

export async function validateFinalImage(options: {
  bytes: Buffer;
  declaredMimeType: string;
  declaredByteSize: number;
}): Promise<{ mimeType: ImageContentType; byteSize: number }> {
  const { bytes, declaredMimeType, declaredByteSize } = options;
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES || bytes.length !== declaredByteSize) {
    throw new InvalidImageError("Image byte size does not match its descriptor");
  }
  try {
    const image = sharp(bytes, { failOn: "warning", limitInputPixels: MAX_IMAGE_PIXELS });
    const metadata = await image.metadata();
    const mimeType = `image/${metadata.format}`;
    if (!isImageContentType(mimeType) || mimeType !== declaredMimeType) {
      throw new InvalidImageError("Image format does not match its descriptor");
    }
    await image.stats();
    return { mimeType, byteSize: bytes.length };
  } catch (error) {
    if (error instanceof InvalidImageError) throw error;
    throw new InvalidImageError("Image could not be decoded", { cause: error });
  }
}
