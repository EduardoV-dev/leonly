import "server-only";

import { z } from "zod";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import type { MemoryDetail, MemoryDetailPhoto } from "../types/memory-detail";
import { getAvailableMemory } from "./get-available-memory";
import { getMemoryPhotoUrl } from "./get-memory-photo";
import { getMemoryReactionSummary, MemoryReactionError } from "./memory-reactions";
import { encodeMemoryVersion } from "./memory-version";

type MemoryVisibility = "timeline" | "vault";

const creatorSchema = z.object({
  display_name: z.string().min(1),
  users: z.object({ avatar_url: z.string().url().nullable() }).nullable().catch(null),
});
const photoRowsSchema = z.array(
  z.object({
    id: z.uuid(),
    position: z.number().int().nonnegative(),
  }),
);

export async function getMemoryDetailForVisibility(
  memoryId: string,
  expectedVisibility: MemoryVisibility,
): Promise<MemoryDetail | null> {
  try {
    const memory = await getAvailableMemory(memoryId);

    if (!memory || memory.visibility !== expectedVisibility) {
      return null;
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [creatorResult, photosResult, reaction] = await Promise.all([
      supabase
        .from("space_members")
        .select("display_name,users(avatar_url)")
        .eq("space_id", memory.spaceId)
        .eq("user_id", memory.creatorUserId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("memory_photos")
        .select("id,position")
        .eq("memory_id", memory.id)
        .order("position", { ascending: true }),
      getMemoryReactionSummary(user.id, memory.id),
    ]);

    if (creatorResult.error || !creatorResult.data) {
      throw new Error("Failed to resolve the memory creator.");
    }
    if (photosResult.error) {
      throw new Error("Failed to resolve the memory photos.");
    }

    const creator = creatorSchema.parse(creatorResult.data);
    const photoRows = photoRowsSchema.parse(photosResult.data ?? []);
    const coverPhoto = photoRows.find((photo) => photo.id === memory.coverPhotoId);
    const orderedRows = coverPhoto
      ? [coverPhoto, ...photoRows.filter((photo) => photo.id !== coverPhoto.id)]
      : photoRows;
    const photos: MemoryDetailPhoto[] = orderedRows.map((photo) => ({
      coverUrl: getMemoryPhotoUrl(memory.id, photo.id, "cover"),
      detailUrl: getMemoryPhotoUrl(memory.id, photo.id, "detail"),
      id: photo.id,
    }));

    return {
      createdAt: memory.createdAt,
      creatorAvatarUrl: creator.users?.avatar_url ?? null,
      creatorDisplayName: creator.display_name,
      description: memory.description,
      id: memory.id,
      location: memory.location,
      memoryDate: memory.memoryDate,
      photos,
      reaction,
      title: memory.title,
      version: encodeMemoryVersion(memory.updatedAt),
      visibility: memory.visibility,
    };
  } catch (error) {
    if (error instanceof MemoryReactionError) return null;
    logServerError({ event: "memory_detail_failed", operation: "get_memory_detail" }, error);
    throw new Error("Failed to load the memory detail.", { cause: error });
  }
}

export function getMemoryDetail(memoryId: string): Promise<MemoryDetail | null> {
  return getMemoryDetailForVisibility(memoryId, "timeline");
}
