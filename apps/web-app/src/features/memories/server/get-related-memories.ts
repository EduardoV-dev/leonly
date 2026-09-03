import "server-only";

import { z } from "zod";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import { RELATED_MEMORIES_LIMIT } from "../constants/timeline";
import type { TimelineMemory } from "../types/timeline";
import { getCoverPreviewUrl } from "./get-cover-preview-url";

const memoryIdSchema = z.uuid();
type MemoryVisibility = "timeline" | "vault";
const relatedMemoryRowsSchema = z.array(
  z.object({
    created_at: z.string(),
    description: z.string().nullable(),
    id: z.uuid(),
    location: z.string().nullable(),
    memory_date: z.string().date(),
    memory_comments: z.array(z.object({ count: z.number().int().nonnegative() })),
    title: z.string(),
  }),
);

export async function getRelatedMemoriesForVisibility(
  memoryId: string,
  visibility: MemoryVisibility,
): Promise<TimelineMemory[]> {
  if (!memoryIdSchema.safeParse(memoryId).success) {
    return [];
  }

  try {
    const activeSpace = await getActiveSpaceForCurrentUser();

    if (!activeSpace) {
      return [];
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("memories")
      .select("id,title,description,location,memory_date,created_at,memory_comments(count)")
      .eq("space_id", activeSpace.id)
      .eq("visibility", visibility)
      .neq("id", memoryId)
      .is("deleted_at", null)
      .order("memory_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(RELATED_MEMORIES_LIMIT);

    if (error) {
      throw error;
    }

    const memories = relatedMemoryRowsSchema.parse(data ?? []);
    return Promise.all(
      memories.map(async (memory) => ({
        commentCount: memory.memory_comments[0]?.count ?? 0,
        coverPhotoUrl: await getCoverPreviewUrl(memory.id),
        createdAt: memory.created_at,
        description: memory.description,
        id: memory.id,
        location: memory.location,
        memoryDate: memory.memory_date,
        title: memory.title,
      })),
    );
  } catch (error) {
    logServerError({ event: "related_memories_failed", operation: "get_related_memories" }, error);
    return [];
  }
}

export function getRelatedMemories(memoryId: string): Promise<TimelineMemory[]> {
  return getRelatedMemoriesForVisibility(memoryId, "timeline");
}
