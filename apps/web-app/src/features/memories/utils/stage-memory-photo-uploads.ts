import { api } from "@/lib/axios/api";
import type { ApiError, ApiResponse } from "@/types/api-response";
import type { MemoryEditorPhoto } from "../types/memory-editor";

const UPLOAD_TIMEOUT_MS = 60_000;
const PHOTO_CONTENT_TYPES: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type UploadCapability = {
  id: string;
  putUrl: string;
  requiredHeaders: { "Content-Type": string; "If-None-Match": "*" };
  expiresAt: string;
};

export type StagedPhotoUploads = {
  timezone: string;
  uploads: { photoKey: string; capability: UploadCapability; isUploaded: boolean }[];
};

export type StageMemoryPhotoUploadsParams = {
  newPhotos: (MemoryEditorPhoto & { kind: "new" })[];
  preparedUpload: StagedPhotoUploads | null;
  onPrepared: (prepared: StagedPhotoUploads) => void;
};

export class PhotoUploadStagingError extends Error {
  constructor(readonly errors: ApiError[]) {
    super("Photo uploads were rejected");
  }
}

export function photoContentType(fileName: string): string | null {
  const extension = fileName.split(".").at(-1)?.toLowerCase() ?? "";

  return PHOTO_CONTENT_TYPES[extension] ?? null;
}

export async function stageMemoryPhotoUploads({
  newPhotos,
  preparedUpload,
  onPrepared,
}: StageMemoryPhotoUploadsParams): Promise<StagedPhotoUploads> {
  let staged = preparedUpload;

  if (!staged) {
    staged = { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, uploads: [] };
    if (newPhotos.length > 0) {
      const descriptors = newPhotos.map(({ file }) => {
        const contentType = photoContentType(file.name);
        if (!contentType) throw new Error("A photo has an unsupported file type");
        return { filename: file.name, contentType, byteSize: file.size };
      });
      const issuance = await api.post<ApiResponse<{ uploads: UploadCapability[] }>>(
        "/files/uploads",
        { purpose: "memory_image", files: descriptors },
        { validateStatus: () => true },
      );
      if (!issuance.data.ok) throw new PhotoUploadStagingError(issuance.data.error);
      if (issuance.data.data.uploads.length !== newPhotos.length) {
        throw new Error("Upload issuance did not match the requested photos");
      }
      staged.uploads = issuance.data.data.uploads.map((capability, index) => ({
        photoKey: newPhotos[index].key,
        capability,
        isUploaded: false,
      }));
    }
    onPrepared(staged);
  }

  const hasMatchingPhotos =
    staged.uploads.length === newPhotos.length &&
    staged.uploads.every(({ photoKey }, index) => photoKey === newPhotos[index].key);
  if (!hasMatchingPhotos) throw new Error("Prepared uploads no longer match the selected photos");

  for (const upload of staged.uploads) {
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
    if (!response.ok && response.status !== 412) throw new Error("A photo could not be uploaded");

    // A 412 means the immutable object already exists; the save verifies content later.
    upload.isUploaded = true;
    onPrepared(staged);
  }

  return staged;
}
