import "server-only";

import { z } from "zod";
import { getAvailableMemory } from "./get-available-memory";
import { getMemoryPhotoUrl } from "./get-memory-photo";

const memoryIdSchema = z.uuid();

export async function getCoverPreviewUrl(memoryId: string): Promise<string | null> {
  if (!memoryIdSchema.safeParse(memoryId).success) {
    return null;
  }

  const memory = await getAvailableMemory(memoryId);

  if (!memory?.coverPhotoId) {
    return null;
  }

  return getMemoryPhotoUrl(memory.id, memory.coverPhotoId, "cover");
}
