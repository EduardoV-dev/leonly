import { createHash } from "node:crypto";
import type { CreateMemoryDto } from "../dtos/create-memory.dto";

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

export function normalizeMemoryText(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

export function normalizeCreation(request: CreateMemoryDto): CreationInput {
  return {
    title: normalizeMemoryText(request.title),
    description: request.description ? normalizeMemoryText(request.description) || null : null,
    location: request.location ? normalizeMemoryText(request.location) || null : null,
    memoryDate: request.memoryDate,
    timezone: request.timezone,
    visibility: request.visibility,
    uploadIds: request.uploadIds.map((id) => id.toLowerCase()),
    coverUploadId: request.coverUploadId?.toLowerCase() ?? null,
    idempotencyKey: request.idempotencyKey.toLowerCase(),
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
