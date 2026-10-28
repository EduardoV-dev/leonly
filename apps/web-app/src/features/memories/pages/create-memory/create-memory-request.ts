import { api } from "@/lib/axios/api";
import type { ApiError, ApiResponse } from "@/types/api-response";
import type { MemoryEditorPhoto, MemoryEditorValues } from "../../types/memory-editor";

const UPLOAD_TIMEOUT_MS = 60_000;
const PHOTO_CONTENT_TYPES: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

type UploadCapability = {
  id: string;
  putUrl: string;
  requiredHeaders: { "Content-Type": string };
  expiresAt: string;
  attachmentDeadline: string;
};

export type PreparedCreationUpload = {
  timezone: string;
  uploads: { photoKey: string; capability: UploadCapability; isUploaded: boolean }[];
};

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
  const newPhotos = photos.filter((photo) => photo.kind === "new");
  if (newPhotos.length !== photos.length) throw new Error("Creation cannot reuse existing assets");
  let prepared = preparedUpload;

  if (!prepared) {
    prepared = { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, uploads: [] };
    if (newPhotos.length > 0) {
      const descriptors = newPhotos.map(({ file }) => {
        const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
        const contentType = PHOTO_CONTENT_TYPES[extension];
        if (!contentType) throw new Error("A photo has an unsupported file type");
        return { filename: file.name, contentType, byteSize: file.size };
      });
      const issuance = await api.post<ApiResponse<{ uploads: UploadCapability[] }>>(
        "/files/uploads",
        { purpose: "memory_image", files: descriptors },
        { validateStatus: () => true },
      );
      if (!issuance.data.ok) throw new MemoryCreationRequestError(issuance.data.error);
      if (issuance.data.data.uploads.length !== newPhotos.length) {
        throw new Error("Upload issuance did not match the requested photos");
      }
      prepared.uploads = issuance.data.data.uploads.map((capability, index) => ({
        photoKey: newPhotos[index].key,
        capability,
        isUploaded: false,
      }));
    }
    onPrepared(prepared);
  }

  const hasMatchingPhotos =
    prepared.uploads.length === newPhotos.length &&
    prepared.uploads.every(({ photoKey }, index) => photoKey === newPhotos[index].key);
  if (!hasMatchingPhotos) throw new Error("Prepared uploads no longer match the selected photos");

  for (const upload of prepared.uploads) {
    if (upload.isUploaded) continue;
    const photo = newPhotos.find(({ key }) => key === upload.photoKey);
    if (!photo) throw new Error("Prepared upload no longer matches the selected photos");
    const response = await fetch(upload.capability.putUrl, {
      method: "PUT",
      body: photo.file,
      headers: upload.capability.requiredHeaders,
      credentials: "omit",
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("A photo could not be uploaded");
    upload.isUploaded = true;
    onPrepared(prepared);
  }

  const response = await api.post<ApiResponse<CreatedMemory>>(
    "/memories",
    {
      ...values,
      timezone: prepared.timezone,
      idempotencyKey,
      uploadIds: prepared.uploads.map(({ capability }) => capability.id),
      coverUploadId:
        prepared.uploads.find(({ photoKey }) => photoKey === coverPhotoKey)?.capability.id ?? null,
    },
    { validateStatus: () => true },
  );
  if (!response.data.ok) throw new MemoryCreationRequestError(response.data.error);
  return response.data.data;
}
