import "server-only";

import { createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
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

export type ValidatedCreateMemoryInput = ValidatedMemoryDetails & {
  coverPhotoIndex: number | null;
  photos: ValidatedMemoryPhoto[];
  requestFingerprint: string;
};

export class MemoryInputError extends Error {
  constructor(
    message: string,
    readonly fields: Record<string, string> = {},
    readonly status = 400,
  ) {
    super(message);
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

  const trimmedValue = value.trim();
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

export async function validateMemoryPhoto(file: File): Promise<ValidatedMemoryPhoto> {
  if (file.size > MAX_MEMORY_PHOTO_SIZE_BYTES) {
    invalidField("photos", "Each photo must be 5 MB or smaller.");
  }

  const extension = getPhotoExtension(file.name);
  if (
    !extension ||
    !ACCEPTED_MEMORY_PHOTO_EXTENSIONS.includes(
      extension as (typeof ACCEPTED_MEMORY_PHOTO_EXTENSIONS)[number],
    )
  ) {
    invalidField("photos", "Photos must use a JPG, JPEG, PNG, or WebP extension.");
  }

  const bytes = await file.arrayBuffer();
  const detectedFileType = await fileTypeFromBuffer(new Uint8Array(bytes)).catch(() => undefined);
  if (!detectedFileType || !isAcceptedPhotoContentType(detectedFileType.mime)) {
    invalidField("photos", "Photos must be JPEG, PNG, or WebP images.");
  }
  const contentType = detectedFileType.mime;
  if (!EXTENSIONS_BY_CONTENT_TYPE[contentType].includes(extension)) {
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

export async function validateMemoryPhotos(
  formData: FormData,
  maxCount: number,
): Promise<ValidatedMemoryPhoto[]> {
  const entries = formData.getAll("photos");
  if (entries.some((entry) => !(entry instanceof File)) || entries.length > maxCount) {
    invalidField("photos", `Choose up to ${maxCount} photos.`);
  }

  const photos: ValidatedMemoryPhoto[] = [];
  for (const entry of entries) {
    photos.push(await validateMemoryPhoto(entry as File));
  }
  return photos;
}

export async function validateCreateMemoryFormData(
  formData: FormData,
): Promise<ValidatedCreateMemoryInput> {
  const details = validateMemoryDetails(formData);
  const photos = await validateMemoryPhotos(formData, MAX_MEMORY_PHOTO_COUNT);
  const coverValue = formData.get("coverPhotoIndex");
  const coverPhotoIndex = photos.length === 0 ? null : Number(coverValue);
  const hasInvalidCover =
    photos.length > 0 &&
    (coverPhotoIndex === null ||
      !Number.isInteger(coverPhotoIndex) ||
      coverPhotoIndex < 0 ||
      coverPhotoIndex >= photos.length);

  if (hasInvalidCover || (photos.length === 0 && coverValue !== null)) {
    invalidField("photos", "Choose one cover photo.");
  }

  const requestFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        ...details,
        coverPhotoIndex,
        photos: photos.map((photo) => photo.digest),
      }),
    )
    .digest("hex");

  return { ...details, coverPhotoIndex, photos, requestFingerprint };
}
