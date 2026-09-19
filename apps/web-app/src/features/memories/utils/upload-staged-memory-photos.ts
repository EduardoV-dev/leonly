import { createClient } from "@/lib/supabase/client";
import type { MemoryEditorPhoto } from "../types/memory-editor";

type UploadDescriptor = { id: string; path: string; token?: string };
type PreparationResponse = {
  grant: string;
  uploads: Array<UploadDescriptor & { token: string }>;
};

export type PreparedMemoryUpload = PreparationResponse;

type MemoryMutationOptions = {
  finalMethod: "PATCH" | "POST";
  finalUrl: string;
  formData: FormData;
  preparedUpload: PreparedMemoryUpload | null;
  onPrepared: (preparedUpload: PreparedMemoryUpload) => void;
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
  preparedUpload,
  onPrepared,
  photos,
  prepareUrl,
}: MemoryMutationOptions): Promise<Response> {
  const newPhotos = photos.filter((photo) => photo.kind === "new");
  let prepared = preparedUpload;
  if (!prepared) {
    const preparation = await fetch(prepareUrl, { body: formData, method: "POST" });
    if (!preparation.ok) return preparation;
    prepared = (await preparation.json()) as PreparationResponse;
    if (
      !Array.isArray(prepared.uploads) ||
      typeof prepared.grant !== "string" ||
      prepared.grant.length === 0
    ) {
      throw new Error("The photo upload service returned an invalid response.");
    }
    onPrepared(prepared);
  }

  if (prepared.uploads.length !== newPhotos.length) {
    throw new Error("The photo upload service returned an invalid response.");
  }
  if (prepared.uploads.some((upload) => typeof upload.token !== "string" || !upload.token)) {
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
        const stored = await supabase.storage
          .from("memory-photos")
          .uploadToSignedUrl(upload.path, upload.token, file, { contentType });
        if (stored.error) throw new Error("A photo could not be uploaded.");
      }),
    );
  }

  return fetch(finalUrl, {
    body: JSON.stringify({ grant: prepared.grant }),
    headers: { "content-type": "application/json" },
    method: finalMethod,
  });
}
