import type { MemoryPlacementResult } from "@leonly/utils/contracts";
import { api } from "@/lib/axios/api";
import type { ApiError, ApiResponse } from "@/types/api-response";
import type { MemoryEdit } from "../../types/memory-edit";
import type { MemoryEditorPhoto, MemoryEditorValues } from "../../types/memory-editor";
import {
  PhotoUploadStagingError,
  type StagedPhotoUploads,
  stageMemoryPhotoUploads,
} from "../../utils/stage-memory-photo-uploads";

export type PreparedEditUpload = StagedPhotoUploads;

export type EditSubmitOutcome =
  | { status: "committed"; result: MemoryPlacementResult }
  | { status: "conflict" }
  | { status: "unavailable" }
  | { status: "unauthorized" }
  | { status: "invalid"; errors: ApiError[] }
  | { status: "retryable" }
  | { status: "uncertain" };

type SubmitMemoryEditParams = {
  memory: MemoryEdit;
  values: MemoryEditorValues;
  photos: MemoryEditorPhoto[];
  coverPhotoKey: string | null;
  preparedUpload: PreparedEditUpload | null;
  onPrepared: (prepared: PreparedEditUpload) => void;
};

type MemoryEditSaveBody = {
  title: string;
  description: string | null;
  location: string | null;
  memoryDate: string;
  timezone: string;
  visibility: MemoryEditorValues["visibility"];
  lastKnownUpdatedAt: string;
  retainedPhotoIds: string[];
  uploadIds: string[];
  coverFileId: string | null;
};

function requestSave(memoryId: string, body: MemoryEditSaveBody) {
  return api.patch<ApiResponse<MemoryPlacementResult>>(`/memories/${memoryId}`, body, {
    validateStatus: () => true,
  });
}

export async function submitMemoryEdit({
  memory,
  values,
  photos,
  coverPhotoKey,
  preparedUpload,
  onPrepared,
}: SubmitMemoryEditParams): Promise<EditSubmitOutcome> {
  const newPhotos = photos.filter(
    (photo): photo is MemoryEditorPhoto & { kind: "new" } => photo.kind === "new",
  );
  const retainedPhotoIds = photos
    .filter((photo): photo is MemoryEditorPhoto & { kind: "retained" } => photo.kind === "retained")
    .map(({ id }) => id);

  let staged: StagedPhotoUploads;
  try {
    staged = await stageMemoryPhotoUploads({ newPhotos, preparedUpload, onPrepared });
  } catch (error) {
    if (error instanceof PhotoUploadStagingError) {
      return { status: "invalid", errors: error.errors };
    }
    return { status: "uncertain" };
  }

  const coverPhoto = photos.find((photo) => photo.key === coverPhotoKey);
  const coverFileId =
    coverPhoto?.kind === "retained"
      ? coverPhoto.id
      : (staged.uploads.find(({ photoKey }) => photoKey === coverPhotoKey)?.capability.id ?? null);

  let response: Awaited<ReturnType<typeof requestSave>>;
  try {
    response = await requestSave(memory.id, {
      title: values.title,
      description: values.description === "" ? null : values.description,
      location: values.location === "" ? null : values.location,
      memoryDate: values.memoryDate,
      timezone: staged.timezone,
      visibility: values.visibility,
      lastKnownUpdatedAt: memory.version,
      retainedPhotoIds,
      uploadIds: staged.uploads.map(({ capability }) => capability.id),
      coverFileId,
    });
  } catch {
    // A timeout, abort, or lost response cannot prove whether the save committed.
    return { status: "uncertain" };
  }

  if (response.status === 401) return { status: "unauthorized" };
  if (response.data.ok) {
    if (typeof response.data.data !== "object" || response.data.data === null) {
      return { status: "uncertain" };
    }

    return { status: "committed", result: response.data.data };
  }
  if (response.status === 404) return { status: "unavailable" };
  if (response.status === 409) return { status: "conflict" };
  if (response.status === 400) return { status: "invalid", errors: response.data.error };

  return { status: "retryable" };
}
