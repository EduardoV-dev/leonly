import type { MemoryEditSaveRequest } from "@leonly/utils/contracts";
import type { EditMemoryDto } from "../dtos/edit-memory.dto";
import { normalizeMemoryText } from "./memory-creation.util";

export function normalizeEditSave(request: EditMemoryDto): MemoryEditSaveRequest {
  return {
    title: normalizeMemoryText(request.title),
    description: request.description ? normalizeMemoryText(request.description) || null : null,
    location: request.location ? normalizeMemoryText(request.location) || null : null,
    memoryDate: request.memoryDate,
    timezone: request.timezone,
    visibility: request.visibility,
    lastKnownUpdatedAt: request.lastKnownUpdatedAt,
    retainedPhotoIds: request.retainedPhotoIds.map((id) => id.toLowerCase()),
    uploadIds: request.uploadIds.map((id) => id.toLowerCase()),
    coverFileId: request.coverFileId?.toLowerCase() ?? null,
  };
}
