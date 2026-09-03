import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAvailableMemory } from "./get-available-memory";

export const memoryPhotoVariantSchema = z.enum(["cover", "detail"]);

const memoryPhotoIdSchema = z.uuid();
const photoMetadataSchema = z.object({
  cover_object_path: z.string().min(1).nullable(),
  detail_object_path: z.string().min(1).nullable(),
  object_path: z.string().min(1),
});

export type MemoryPhotoVariant = z.infer<typeof memoryPhotoVariantSchema>;

export function getMemoryPhotoUrl(
  memoryId: string,
  photoId: string,
  variant: MemoryPhotoVariant,
): string {
  return `/api/memories/${memoryId}/photos/${photoId}/${variant}`;
}

export async function getMemoryPhoto(
  memoryId: string,
  photoId: string,
  variant: string,
): Promise<ArrayBuffer | null> {
  if (
    !memoryPhotoIdSchema.safeParse(memoryId).success ||
    !memoryPhotoIdSchema.safeParse(photoId).success ||
    !memoryPhotoVariantSchema.safeParse(variant).success
  ) {
    return null;
  }

  const memory = await getAvailableMemory(memoryId);
  if (!memory) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_photos")
    .select("object_path,cover_object_path,detail_object_path")
    .eq("id", photoId)
    .eq("memory_id", memory.id)
    .maybeSingle();

  if (error || !data) return null;

  const photo = photoMetadataSchema.safeParse(data);
  if (!photo.success) return null;

  const objectPath =
    variant === "cover"
      ? (photo.data.cover_object_path ?? photo.data.object_path)
      : (photo.data.detail_object_path ?? photo.data.object_path);
  const { data: object, error: downloadError } = await createAdminClient()
    .storage.from("memory-photos")
    .download(objectPath);

  if (downloadError || !object) return null;
  return object.arrayBuffer();
}
