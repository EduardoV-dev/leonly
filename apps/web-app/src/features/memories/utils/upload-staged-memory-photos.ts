import { createClient } from "@/lib/supabase/client";
import type { MemoryEditorPhoto } from "../types/memory-editor";

type UploadDescriptor = { id: string; path: string; token?: string };
type PreparationResponse =
  | {
      attemptId: string;
      grant?: never;
      uploads: UploadDescriptor[];
    }
  | {
      attemptId?: never;
      grant: string;
      uploads: Array<UploadDescriptor & { token: string }>;
    };

export type MemoryUploadAttempt = PreparationResponse;

type MemoryMutationOptions = {
  finalMethod: "PATCH" | "POST";
  finalUrl: string;
  formData: FormData;
  attempt: MemoryUploadAttempt | null;
  onPrepared: (attempt: MemoryUploadAttempt) => void;
  photos: MemoryEditorPhoto[];
  prepareUrl: string;
};

function getPhotoContentType(fileName: string): "image/jpeg" | "image/png" | "image/webp" | null {
  const extension = fileName.split(".").at(-1)?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return null;
}

export async function uploadStagedMemoryPhotos({
  finalMethod,
  finalUrl,
  formData,
  attempt,
  onPrepared,
  photos,
  prepareUrl,
}: MemoryMutationOptions): Promise<Response> {
  const newPhotos = photos.filter((photo) => photo.kind === "new");
  let prepared = attempt;
  if (!prepared) {
    const preparation = await fetch(prepareUrl, { body: formData, method: "POST" });
    if (!preparation.ok) return preparation;
    prepared = (await preparation.json()) as PreparationResponse;
    if (
      !Array.isArray(prepared.uploads) ||
      (typeof prepared.attemptId !== "string" &&
        (typeof prepared.grant !== "string" || prepared.grant.length === 0))
    ) {
      throw new Error("The photo upload service returned an invalid response.");
    }
    onPrepared(prepared);
  }

  if (prepared.uploads.length !== newPhotos.length) {
    throw new Error("The photo upload service returned an invalid response.");
  }
  if (
    prepared.grant &&
    prepared.uploads.some((upload) => typeof upload.token !== "string" || !upload.token)
  ) {
    throw new Error("The photo upload service returned an invalid response.");
  }

  const filesById = new Map(newPhotos.map((photo) => [photo.id, photo.file]));
  if (prepared.uploads.length > 0) {
    const supabase = createClient();
    await Promise.all(
      prepared.uploads.map(async (upload) => {
        const file = filesById.get(upload.id);
        if (!file || typeof upload.path !== "string" || upload.path.length === 0) {
          throw new Error("The photo upload service returned an invalid response.");
        }
        const contentType = getPhotoContentType(file.name);
        if (!contentType) throw new Error("A photo has an unsupported file type.");
        const bucket = supabase.storage.from("memory-photos");
        const stored = upload.token
          ? await bucket.uploadToSignedUrl(upload.path, upload.token, file, { contentType })
          : await bucket.upload(upload.path, file, { contentType, upsert: true });
        if (stored.error) throw new Error("A photo could not be uploaded.");
      }),
    );
  }

  return fetch(finalUrl, {
    body: JSON.stringify(
      prepared.grant ? { grant: prepared.grant } : { attemptId: prepared.attemptId },
    ),
    headers: { "content-type": "application/json" },
    method: finalMethod,
  });
}
