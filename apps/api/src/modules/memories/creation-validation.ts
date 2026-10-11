import { createHash } from "node:crypto";
import { isUUID } from "class-validator";
import { invalidInput, MAX_IMAGE_COUNT, requireObject } from "../files/upload-validation";

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

function normalizeText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") invalidInput(field, "Provide text.");
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (normalized.length > maxLength) invalidInput(field, `Use ${maxLength} characters or fewer.`);
  return normalized || null;
}

function normalizeUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !isUUID(value)) invalidInput(field, "Provide a valid UUID.");
  return value.toLowerCase();
}

export function normalizeCreation(value: unknown): CreationInput {
  const request = requireObject(value, [
    "title",
    "description",
    "location",
    "memoryDate",
    "timezone",
    "visibility",
    "uploadIds",
    "coverUploadId",
    "idempotencyKey",
  ]);
  const title = normalizeText(request.title, "title", 120);
  if (!title) invalidInput("title", "Enter a title.");
  const description = normalizeText(request.description, "description", 2000);
  const location = normalizeText(request.location, "location", 150);
  const { memoryDate, timezone, visibility, uploadIds } = request;
  if (typeof memoryDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(memoryDate)) {
    invalidInput("memoryDate", "Choose a valid memory date.");
  }
  const date = new Date(`${memoryDate}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== memoryDate) {
    invalidInput("memoryDate", "Choose a valid memory date.");
  }
  if (typeof timezone !== "string" || timezone.length === 0) {
    invalidInput("timezone", "Choose a valid timezone.");
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
    invalidInput("timezone", "Choose a valid timezone.");
  }
  if (memoryDate > today) invalidInput("memoryDate", "Memory date cannot be in the future.");
  if (visibility !== "timeline" && visibility !== "vault") {
    invalidInput("visibility", "Choose timeline or vault.");
  }
  if (!Array.isArray(uploadIds) || uploadIds.length > MAX_IMAGE_COUNT) {
    invalidInput("uploadIds", "Choose up to 10 photos.");
  }
  const ids = uploadIds.map((id) => normalizeUuid(id, "uploadIds"));
  if (new Set(ids).size !== ids.length) invalidInput("uploadIds", "Choose each photo only once.");
  const coverUploadId =
    request.coverUploadId == null ? null : normalizeUuid(request.coverUploadId, "coverUploadId");
  if (coverUploadId !== null && !ids.includes(coverUploadId)) {
    invalidInput("coverUploadId", "Choose an attached cover photo.");
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
    idempotencyKey: normalizeUuid(request.idempotencyKey, "idempotencyKey"),
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
