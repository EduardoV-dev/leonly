import { api } from "@/lib/axios/api";
import type { ApiError, ApiResponse } from "@/types/api-response";
import type { MemoryEditorPhoto, MemoryEditorValues } from "../../types/memory-editor";
import {
  PhotoUploadStagingError,
  type StagedPhotoUploads,
  stageMemoryPhotoUploads,
} from "../../utils/stage-memory-photo-uploads";

export type PreparedCreationUpload = StagedPhotoUploads;

export type CreatedMemory = { id: string; visibility: "timeline" | "vault" };

type SubmitMemoryCreationParams = {
  values: MemoryEditorValues;
  photos: MemoryEditorPhoto[];
  coverPhotoKey: string | null;
  idempotencyKey: string;
  preparedUpload: PreparedCreationUpload | null;
  onPrepared: (upload: PreparedCreationUpload) => void;
};

export class MemoryCreationRequestError extends Error {
  constructor(readonly errors: ApiError[]) {
    super("Memory creation was rejected");
  }
}

export async function submitMemoryCreation({
  values,
  photos,
  coverPhotoKey,
  idempotencyKey,
  preparedUpload,
  onPrepared,
}: SubmitMemoryCreationParams): Promise<CreatedMemory> {
  const newPhotos = photos.filter(
    (photo): photo is MemoryEditorPhoto & { kind: "new" } => photo.kind === "new",
  );
  if (newPhotos.length !== photos.length) throw new Error("Creation cannot reuse existing assets");

  let staged: StagedPhotoUploads;
  try {
    staged = await stageMemoryPhotoUploads({ newPhotos, preparedUpload, onPrepared });
  } catch (error) {
    if (error instanceof PhotoUploadStagingError)
      throw new MemoryCreationRequestError(error.errors);
    throw error;
  }

  const response = await api.post<ApiResponse<CreatedMemory>>(
    "/memories",
    {
      ...values,
      timezone: staged.timezone,
      idempotencyKey,
      uploadIds: staged.uploads.map(({ capability }) => capability.id),
      coverUploadId:
        staged.uploads.find(({ photoKey }) => photoKey === coverPhotoKey)?.capability.id ?? null,
    },
    { validateStatus: () => true },
  );
  if (!response.data.ok) throw new MemoryCreationRequestError(response.data.error);
  return response.data.data;
}
