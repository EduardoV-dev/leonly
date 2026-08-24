import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const memoryIdSchema = z.uuid();

export type AvailableMemory = {
  coverPhotoId: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  location: string | null;
  memoryDate: string;
  title: string;
  visibility: "timeline" | "vault";
};

const availableMemorySchema = z.object({
  cover_photo_id: z.uuid().nullable(),
  created_at: z.string(),
  description: z.string().nullable(),
  id: z.uuid(),
  location: z.string().nullable(),
  memory_date: z.string().date(),
  title: z.string(),
  visibility: z.enum(["timeline", "vault"]),
});

export async function getAvailableMemory(memoryId: string): Promise<AvailableMemory | null> {
  if (!memoryIdSchema.safeParse(memoryId).success) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_available_memory", { p_memory_id: memoryId });

  if (error) {
    throw new Error("Failed to resolve the memory.");
  }

  if (!data) {
    return null;
  }

  const memory = availableMemorySchema.parse(data);
  return {
    coverPhotoId: memory.cover_photo_id,
    createdAt: memory.created_at,
    description: memory.description,
    id: memory.id,
    location: memory.location,
    memoryDate: memory.memory_date,
    title: memory.title,
    visibility: memory.visibility,
  };
}
