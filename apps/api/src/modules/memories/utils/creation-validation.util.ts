import { createHash } from "node:crypto";
import { isUUID } from "class-validator";
import { requireObject, throwInputValidationError } from "../../../common/utils/input-validation";
import { MAX_IMAGE_COUNT } from "../../files/utils/upload-validation.util";

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_LOCATION_LENGTH = 150;

type NormalizeTextParams = { value: unknown; field: string; maxLength: number };
type NormalizeUuidParams = { value: unknown; field: string };

export type CreationInput = {
  title: string;
  description: string | null;
  location: string | null;
  memoryDate: string;
  timezone: string;
  visibility: "timeline" | "vault";
  uploadIds: string[];
  coverUploadId: string | null;
  idempotencyKey: string;
};

function normalizeText({ value, field, maxLength }: NormalizeTextParams): string | null {
  if (value == null) return null;
  if (typeof value !== "string") throwInputValidationError({ field, message: "Provide text." });

  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (normalized.length > maxLength)
    throwInputValidationError({ field, message: `Use ${maxLength} characters or fewer.` });

  return normalized || null;
}

function normalizeUuid({ value, field }: NormalizeUuidParams): string {
  const isValidUuid = typeof value === "string" && isUUID(value);

  if (!isValidUuid) throwInputValidationError({ field, message: "Provide a valid UUID." });

  return value.toLowerCase();
}

export function normalizeCreation(value: unknown): CreationInput {
  const request = requireObject({
    value,
    allowedFields: [
      "title",
      "description",
      "location",
      "memoryDate",
      "timezone",
      "visibility",
      "uploadIds",
      "coverUploadId",
      "idempotencyKey",
    ],
  });
  const title = normalizeText({
    value: request.title,
    field: "title",
    maxLength: MAX_TITLE_LENGTH,
  });

  if (!title) throwInputValidationError({ field: "title", message: "Enter a title." });

  const description = normalizeText({
    value: request.description,
    field: "description",
    maxLength: MAX_DESCRIPTION_LENGTH,
  });
  const location = normalizeText({
    value: request.location,
    field: "location",
    maxLength: MAX_LOCATION_LENGTH,
  });
  const { memoryDate, timezone, visibility, uploadIds } = request;
  const isDateString = typeof memoryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(memoryDate);

  if (!isDateString) {
    throwInputValidationError({ field: "memoryDate", message: "Choose a valid memory date." });
  }

  const date = new Date(`${memoryDate}T00:00:00.000Z`);
  const isValidCalendarDate =
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === memoryDate;

  if (!isValidCalendarDate) {
    throwInputValidationError({ field: "memoryDate", message: "Choose a valid memory date." });
  }

  const isValidTimezoneInput = typeof timezone === "string" && timezone.length > 0;

  if (!isValidTimezoneInput) {
    throwInputValidationError({ field: "timezone", message: "Choose a valid timezone." });
  }

  let today: string;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    today = `${fields.year}-${fields.month}-${fields.day}`;
  } catch {
    throwInputValidationError({ field: "timezone", message: "Choose a valid timezone." });
  }

  if (memoryDate > today)
    throwInputValidationError({
      field: "memoryDate",
      message: "Memory date cannot be in the future.",
    });

  const isValidVisibility = visibility === "timeline" || visibility === "vault";

  if (!isValidVisibility) {
    throwInputValidationError({ field: "visibility", message: "Choose timeline or vault." });
  }

  const hasInvalidUploadCount = !Array.isArray(uploadIds) || uploadIds.length > MAX_IMAGE_COUNT;

  if (hasInvalidUploadCount) {
    throwInputValidationError({ field: "uploadIds", message: "Choose up to 10 photos." });
  }

  const ids = uploadIds.map((value) => normalizeUuid({ value, field: "uploadIds" }));
  if (new Set(ids).size !== ids.length)
    throwInputValidationError({ field: "uploadIds", message: "Choose each photo only once." });

  const coverUploadId =
    request.coverUploadId == null
      ? null
      : normalizeUuid({ value: request.coverUploadId, field: "coverUploadId" });
  const hasUnattachedCover = coverUploadId !== null && !ids.includes(coverUploadId);

  if (hasUnattachedCover) {
    throwInputValidationError({
      field: "coverUploadId",
      message: "Choose an attached cover photo.",
    });
  }

  return {
    title,
    description,
    location,
    memoryDate,
    timezone,
    visibility,
    uploadIds: ids,
    coverUploadId,
    idempotencyKey: normalizeUuid({ value: request.idempotencyKey, field: "idempotencyKey" }),
  };
}

export function hashCreation(input: CreationInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        title: input.title,
        description: input.description,
        location: input.location,
        memoryDate: input.memoryDate,
        timezone: input.timezone,
        visibility: input.visibility,
        uploadIds: input.uploadIds,
        coverUploadId: input.coverUploadId,
      }),
    )
    .digest("hex");
}
