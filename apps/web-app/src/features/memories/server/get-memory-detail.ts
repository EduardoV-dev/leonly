import "server-only";

import { z } from "zod";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import type { MemoryDetail, MemoryDetailPhoto } from "../types/memory-detail";
import { getAvailableMemory } from "./get-available-memory";

const SIGNED_URL_TTL_SECONDS = 300;

const creatorSchema = z.object({ display_name: z.string().min(1) });
const photoRowsSchema = z.array(
  z.object({
    id: z.uuid(),
    object_path: z.string().min(1),
    position: z.number().int().nonnegative(),
  }),
);

export async function getMemoryDetail(memoryId: string): Promise<MemoryDetail | null> {
  try {
    const memory = await getAvailableMemory(memoryId);

    if (!memory) {
      return null;
    }

    const supabase = await createClient();
    const [creatorResult, photosResult] = await Promise.all([
      supabase
        .from("space_members")
        .select("display_name")
        .eq("space_id", memory.spaceId)
        .eq("user_id", memory.creatorUserId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("memory_photos")
        .select("id,object_path,position")
        .eq("memory_id", memory.id)
        .order("position", { ascending: true }),
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
    const photos: MemoryDetailPhoto[] = await Promise.all(
      orderedRows.map(async (photo) => {
        const { data, error } = await supabase.storage
          .from("memory-photos")
          .createSignedUrl(photo.object_path, SIGNED_URL_TTL_SECONDS);

        return {
          id: photo.id,
          url: error ? null : (data?.signedUrl ?? null),
        };
      }),
    );

    return {
      createdAt: memory.createdAt,
      creatorDisplayName: creator.display_name,
      description: memory.description,
      id: memory.id,
      location: memory.location,
      memoryDate: memory.memoryDate,
      photos,
      title: memory.title,
      visibility: memory.visibility,
    };
  } catch (error) {
    logServerError({ event: "memory_detail_failed", operation: "get_memory_detail" }, error);
    throw new Error("Failed to load the memory detail.", { cause: error });
  }
}
