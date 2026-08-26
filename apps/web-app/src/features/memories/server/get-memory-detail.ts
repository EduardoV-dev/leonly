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
    cover_object_path: z.string().min(1).nullable(),
    detail_object_path: z.string().min(1).nullable(),
    id: z.uuid(),
    object_path: z.string().min(1),
    position: z.number().int().nonnegative(),
  }),
);

async function signPhotoPaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coverPath: string,
  detailPath: string,
): Promise<Pick<MemoryDetailPhoto, "coverUrl" | "detailUrl">> {
  if (coverPath === detailPath) {
    const { data, error } = await supabase.storage
      .from("memory-photos")
      .createSignedUrl(coverPath, SIGNED_URL_TTL_SECONDS);
    const url = error ? null : (data?.signedUrl ?? null);
    return { coverUrl: url, detailUrl: url };
  }

  const [coverResult, detailResult] = await Promise.all([
    supabase.storage.from("memory-photos").createSignedUrl(coverPath, SIGNED_URL_TTL_SECONDS),
    supabase.storage.from("memory-photos").createSignedUrl(detailPath, SIGNED_URL_TTL_SECONDS),
  ]);

  return {
    coverUrl: coverResult.error ? null : (coverResult.data?.signedUrl ?? null),
    detailUrl: detailResult.error ? null : (detailResult.data?.signedUrl ?? null),
  };
}

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
        .select("id,object_path,cover_object_path,detail_object_path,position")
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
        const urls = await signPhotoPaths(
          supabase,
          photo.cover_object_path ?? photo.object_path,
          photo.detail_object_path ?? photo.object_path,
        );

        return {
          id: photo.id,
          ...urls,
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
