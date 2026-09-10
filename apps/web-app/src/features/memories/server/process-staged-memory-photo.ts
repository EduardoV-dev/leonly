import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ValidatedStagedMemoryPhoto } from "./memory-input-validation";
import { validateMemoryPhotoBytes } from "./memory-input-validation";

export type StagedMemoryPhotoUpload = ValidatedStagedMemoryPhoto & {
  coverPath: string;
  detailPath: string;
  originalPath: string;
};

export async function isStagedMemoryPhotoReady(
  table: "memory_edit_photo_staging" | "memory_photo_staging",
  attemptId: string,
  photoId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const response = await admin
    .from(table)
    .select("uploaded_at")
    .eq("attempt_id", attemptId)
    .eq("id", photoId)
    .maybeSingle();
  if (response.error || !response.data) {
    throw new Error("Unable to inspect the staged memory photo.", { cause: response.error });
  }
  return response.data.uploaded_at !== null;
}

export async function processStagedMemoryPhoto(
  upload: StagedMemoryPhotoUpload,
  markUploaded: () => Promise<void>,
): Promise<void> {
  const admin = createAdminClient();
  const downloaded = await admin.storage.from("memory-photos").download(upload.originalPath);
  if (downloaded.error || !downloaded.data) {
    throw new Error("Unable to download the staged memory photo.", {
      cause: downloaded.error,
    });
  }

  const photo = await validateMemoryPhotoBytes(upload.name, await downloaded.data.arrayBuffer());
  const variants = [
    { bytes: photo.variants.cover, path: upload.coverPath },
    { bytes: photo.variants.detail, path: upload.detailPath },
  ] as const;

  for (const variant of variants) {
    const stored = await admin.storage.from("memory-photos").upload(variant.path, variant.bytes, {
      contentType: "image/webp",
      upsert: true,
    });
    if (stored.error) {
      throw new Error("Unable to store a memory photo variant.", { cause: stored.error });
    }
  }

  await markUploaded();
}
