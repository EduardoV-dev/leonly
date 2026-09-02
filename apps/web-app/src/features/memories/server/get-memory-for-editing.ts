import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { MemoryEdit, MemoryEditPhoto } from "../types/memory-edit";
import { getAvailableMemory } from "./get-available-memory";
import { encodeMemoryVersion } from "./memory-version";

const SIGNED_URL_TTL_SECONDS = 300;
const photoRowsSchema = z.array(
  z.object({
    detail_object_path: z.string().min(1).nullable(),
    id: z.uuid(),
    object_path: z.string().min(1),
    position: z.number().int().nonnegative(),
  }),
);

export async function getMemoryForEditing(memoryId: string): Promise<MemoryEdit | null> {
  const memory = await getAvailableMemory(memoryId);
  if (!memory) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_photos")
    .select("id,object_path,detail_object_path,position")
    .eq("memory_id", memory.id)
    .order("position", { ascending: true });

  if (error) {
    throw new Error("Failed to resolve editable memory photos.");
  }

  const rows = photoRowsSchema.parse(data ?? []);
  const photos: MemoryEditPhoto[] = await Promise.all(
    rows.map(async (photo) => {
      const path = photo.detail_object_path ?? photo.object_path;
      const signed = await supabase.storage
        .from("memory-photos")
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      return { id: photo.id, previewUrl: signed.error ? null : (signed.data?.signedUrl ?? null) };
    }),
  );

  return {
    coverPhotoId: memory.coverPhotoId,
    description: memory.description,
    id: memory.id,
    initialVisibility: memory.visibility,
    location: memory.location,
    memoryDate: memory.memoryDate,
    photos,
    title: memory.title,
    version: encodeMemoryVersion(memory.updatedAt),
  };
}
