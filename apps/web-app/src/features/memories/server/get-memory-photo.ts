import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAvailableMemory } from "./get-available-memory";

export const memoryPhotoVariantSchema = z.enum(["cover", "detail"]);

const memoryPhotoIdSchema = z.uuid();
const assetObjectSchema = z.object({
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
    .from("memory_asset_objects")
    .select("object_path,memory_assets!inner(memory_id,space_id)")
    .eq("asset_id", photoId)
    .eq("variant_type", variant)
    .eq("status", "ready")
    .eq("memory_assets.memory_id", memory.id)
    .eq("memory_assets.space_id", memory.spaceId)
    .maybeSingle();

  if (error || !data) return null;

  const objectMetadata = assetObjectSchema.safeParse(data);
  if (!objectMetadata.success) return null;

  const { data: object, error: downloadError } = await supabase.storage
    .from("memory-photos")
    .download(objectMetadata.data.object_path);

  if (downloadError || !object) return null;
  return object.arrayBuffer();
}
