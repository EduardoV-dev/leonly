import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { MemoryEdit, MemoryEditPhoto } from "../types/memory-edit";
import { getAvailableMemory } from "./get-available-memory";
import { getMemoryPhotoUrl } from "./get-memory-photo";
import { encodeMemoryVersion } from "./memory-version";

const photoRowsSchema = z.array(
  z.object({
    id: z.uuid(),
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
    .select("id,position")
    .eq("memory_id", memory.id)
    .order("position", { ascending: true });

  if (error) {
    throw new Error("Failed to resolve editable memory photos.");
  }

  const rows = photoRowsSchema.parse(data ?? []);
  const photos: MemoryEditPhoto[] = rows.map((photo) => ({
    id: photo.id,
    previewUrl: getMemoryPhotoUrl(memory.id, photo.id, "detail"),
  }));

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
