import "server-only";

import { createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import {
  ACCEPTED_MEMORY_PHOTO_EXTENSIONS,
  ACCEPTED_MEMORY_PHOTO_TYPES,
  MAX_MEMORY_PHOTO_COUNT,
  MAX_MEMORY_PHOTO_SIZE_BYTES,
} from "../constants/create-memory";
import {
  createMemoryPhotoVariants,
  type MemoryPhotoVariants,
} from "./create-memory-photo-variants";

const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_LOCATION_LENGTH = 150;
const MAX_TITLE_LENGTH = 120;
const MEMORY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type MemoryPhotoContentType = (typeof ACCEPTED_MEMORY_PHOTO_TYPES)[number];

const EXTENSIONS_BY_CONTENT_TYPE: Record<MemoryPhotoContentType, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

export type ValidatedMemoryDetails = {
  description: string | null;
  location: string | null;
  memoryDate: string;
  timezone: string;
  title: string;
  visibility: "timeline" | "vault";
};

export type ValidatedMemoryPhoto = {
  bytes: ArrayBuffer;
  contentType: MemoryPhotoContentType;
  digest: string;
  variants: MemoryPhotoVariants;
};

export type ValidatedStagedMemoryPhoto = {
  id: string;
  name: string;
};

export type ValidatedCreateMemoryInput = ValidatedMemoryDetails & {
  coverPhotoId: string | null;
  photos: ValidatedStagedMemoryPhoto[];
};

export class MemoryInputError extends Error {
  constructor(
    message: string,
    readonly fields: Record<string, string> = {},
    readonly status = 400,
    readonly code = "validation_failed",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

function invalidField(field: string, message: string): never {
  throw new MemoryInputError("Please review the highlighted fields.", { [field]: message });
}

function asTrimmedText(
  value: FormDataEntryValue | null,
  field: string,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    invalidField(field, "Required.");
  }

  // Multipart form parsing expands textarea line breaks from \n to \r\n.
  const trimmedValue = value.replace(/\r\n?/g, "\n").trim();
  if (field === "title" && trimmedValue.length === 0) {
    invalidField(field, "Required.");
  }
  if (trimmedValue.length > maxLength) {
    invalidField(field, `Must be ${maxLength} characters or fewer.`);
  }

  return trimmedValue || null;
}

function getCurrentDateInTimezone(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).formatToParts();
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    invalidField("timezone", "Choose a valid timezone.");
  }
}

function isRealCalendarDate(value: string): boolean {
  if (!MEMORY_DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function getPhotoExtension(fileName: string): string | null {
  const extension = fileName.split(".").at(-1)?.toLowerCase();
  return extension && extension !== fileName.toLowerCase() ? extension : null;
}

function isAcceptedPhotoContentType(contentType: string): contentType is MemoryPhotoContentType {
  return ACCEPTED_MEMORY_PHOTO_TYPES.includes(
    contentType as (typeof ACCEPTED_MEMORY_PHOTO_TYPES)[number],
  );
}

export function validateMemoryDetails(formData: FormData): ValidatedMemoryDetails {
  const title = asTrimmedText(formData.get("title"), "title", MAX_TITLE_LENGTH);
  const description = asTrimmedText(
    formData.get("description"),
    "description",
    MAX_DESCRIPTION_LENGTH,
  );
  const location = asTrimmedText(formData.get("location"), "location", MAX_LOCATION_LENGTH);
  const memoryDate = formData.get("memoryDate");
  const timezone = formData.get("timezone");
  const visibility = formData.get("visibility");

  if (typeof memoryDate !== "string" || !isRealCalendarDate(memoryDate)) {
    invalidField("memoryDate", "Choose a valid date.");
  }
  if (typeof timezone !== "string" || timezone.length === 0) {
    invalidField("timezone", "Choose a valid timezone.");
  }
  if (memoryDate > getCurrentDateInTimezone(timezone)) {
    invalidField("memoryDate", "A memory date cannot be in the future.");
  }
  if (visibility !== "timeline" && visibility !== "vault") {
    invalidField("visibility", "Choose where this memory belongs.");
  }

  return {
    description,
    location,
    memoryDate,
    timezone,
    title: title ?? "",
    visibility,
  };
}

export async function validateMemoryPhotoBytes(
  fileName: string | null,
  bytes: ArrayBuffer,
): Promise<ValidatedMemoryPhoto> {
  if (bytes.byteLength > MAX_MEMORY_PHOTO_SIZE_BYTES) {
    invalidField("photos", "Each photo must be 5 MB or smaller.");
  }

  const extension = fileName ? getPhotoExtension(fileName) : null;
  if (
    fileName &&
    (!extension ||
      !ACCEPTED_MEMORY_PHOTO_EXTENSIONS.includes(
        extension as (typeof ACCEPTED_MEMORY_PHOTO_EXTENSIONS)[number],
      ))
  )
    invalidField("photos", "Photos must use a JPG, JPEG, PNG, or WebP extension.");

  const detectedFileType = await fileTypeFromBuffer(new Uint8Array(bytes)).catch(() => undefined);
  if (!detectedFileType || !isAcceptedPhotoContentType(detectedFileType.mime)) {
    invalidField("photos", "Photos must be JPEG, PNG, or WebP images.");
  }
  const contentType = detectedFileType.mime;
  if (extension && !EXTENSIONS_BY_CONTENT_TYPE[contentType].includes(extension)) {
    invalidField("photos", "Photo file extensions must match their image type.");
  }

  try {
    return {
      bytes,
      contentType,
      digest: createHash("sha256").update(Buffer.from(bytes)).digest("hex"),
      variants: await createMemoryPhotoVariants(bytes),
    };
  } catch {
    invalidField("photos", "One or more photos could not be processed.");
  }
}

export async function validateMemoryPhoto(file: File): Promise<ValidatedMemoryPhoto> {
  if (file.size > MAX_MEMORY_PHOTO_SIZE_BYTES) {
    invalidField("photos", "Each photo must be 5 MB or smaller.");
  }
  return validateMemoryPhotoBytes(file.name, await file.arrayBuffer());
}

export function validateStagedMemoryPhotos(
  formData: FormData,
  maxCount: number,
): ValidatedStagedMemoryPhoto[] {
  if (formData.getAll("photos").length > 0) {
    invalidField("photos", "Upload photos directly before saving the memory.");
  }
  const photoIds = formData.getAll("photoIds");
  const photoNames = formData.getAll("photoNames");
  if (
    photoIds.length !== photoNames.length ||
    photoIds.length > maxCount ||
    photoIds.some((entry) => typeof entry !== "string" || !z.uuid().safeParse(entry).success) ||
    photoNames.some((entry) => typeof entry !== "string")
  ) {
    invalidField("photos", `Choose up to ${maxCount} photos.`);
  }

  const ids = photoIds as string[];
  if (new Set(ids).size !== ids.length) {
    invalidField("photos", "A photo was included more than once.");
  }

  return ids.map((id, index) => {
    const name = photoNames[index] as string;
    const extension = getPhotoExtension(name);
    if (
      !extension ||
      !ACCEPTED_MEMORY_PHOTO_EXTENSIONS.includes(
        extension as (typeof ACCEPTED_MEMORY_PHOTO_EXTENSIONS)[number],
      )
    ) {
      invalidField("photos", "Photos must use a JPG, JPEG, PNG, or WebP extension.");
    }
    return { id, name };
  });
}

export async function validateCreateMemoryFormData(
  formData: FormData,
): Promise<ValidatedCreateMemoryInput> {
  const details = validateMemoryDetails(formData);
  const photos = validateStagedMemoryPhotos(formData, MAX_MEMORY_PHOTO_COUNT);
  const coverValue = formData.get("coverPhotoId");
  const coverPhotoId = typeof coverValue === "string" ? coverValue : null;
  const hasInvalidCover =
    coverPhotoId !== null && !photos.some((photo) => photo.id === coverPhotoId);

  if (hasInvalidCover || (photos.length === 0 && coverValue !== null)) {
    invalidField("photos", "Choose one cover photo.");
  }

  return { ...details, coverPhotoId, photos };
}
