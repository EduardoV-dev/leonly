import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAvailableMemory } from "./get-available-memory";

const SIGNED_URL_TTL_SECONDS = 300;
const memoryIdSchema = z.uuid();
const coverPhotoSchema = z.object({
  cover_object_path: z.string().min(1).nullable(),
  object_path: z.string().min(1),
});

export async function getCoverPreviewUrl(memoryId: string): Promise<string | null> {
  if (!memoryIdSchema.safeParse(memoryId).success) {
    return null;
  }

  const memory = await getAvailableMemory(memoryId);

  if (!memory?.coverPhotoId) {
    return null;
  }

  const supabase = await createClient();
  const { data: photo, error: photoError } = await supabase
    .from("memory_photos")
    .select("object_path,cover_object_path")
    .eq("id", memory.coverPhotoId)
    .eq("memory_id", memory.id)
    .maybeSingle();

  if (photoError) {
    throw new Error("Failed to resolve the memory cover.");
  }

  if (!photo) {
    return null;
  }

  const { cover_object_path: coverObjectPath, object_path: objectPath } =
    coverPhotoSchema.parse(photo);
  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from("memory-photos")
    .createSignedUrl(coverObjectPath ?? objectPath, SIGNED_URL_TTL_SECONDS);

  if (signedUrlError) {
    return null;
  }

  return signedUrl.signedUrl;
}
