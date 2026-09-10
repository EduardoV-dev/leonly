import { createClient } from "@/lib/supabase/client";
import type { MemoryEditorPhoto } from "../types/memory-editor";

type UploadDescriptor = { id: string; path: string };
type PreparationResponse = {
  result: unknown | null;
  uploads: UploadDescriptor[];
};

type MemoryMutationOptions = {
  finalMethod: "PATCH" | "POST";
  finalUrl: string;
  formData: FormData;
  idempotencyKey: string;
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

function responseForCompletedPreparation(result: unknown): Response {
  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

export async function uploadStagedMemoryPhotos({
  finalMethod,
  finalUrl,
  formData,
  idempotencyKey,
  photos,
  prepareUrl,
}: MemoryMutationOptions): Promise<Response> {
  const headers = { "Idempotency-Key": idempotencyKey };
  const newPhotos = photos.filter((photo) => photo.kind === "new");
  if (newPhotos.length === 0) {
    return fetch(finalUrl, { body: formData, headers, method: finalMethod });
  }

  const preparation = await fetch(prepareUrl, { body: formData, headers, method: "POST" });
  if (!preparation.ok) return preparation;

  const payload = (await preparation.json()) as PreparationResponse;
  if (payload.result) return responseForCompletedPreparation(payload.result);

  if (!Array.isArray(payload.uploads) || payload.uploads.length !== newPhotos.length) {
    throw new Error("The photo upload service returned an invalid response.");
  }

  const filesById = new Map(newPhotos.map((photo) => [photo.id, photo.file]));
  const supabase = createClient();
  await Promise.all(
    payload.uploads.map(async (upload) => {
      const file = filesById.get(upload.id);
      if (!file || typeof upload.path !== "string" || upload.path.length === 0) {
        throw new Error("The photo upload service returned an invalid response.");
      }
      const contentType = getPhotoContentType(file.name);
      if (!contentType) throw new Error("A photo has an unsupported file type.");
      const stored = await supabase.storage.from("memory-photos").upload(upload.path, file, {
        contentType,
        upsert: true,
      });
      if (stored.error) throw new Error("A photo could not be uploaded.");
    }),
  );

  return fetch(finalUrl, { body: formData, headers, method: finalMethod });
}
