import "server-only";

import type { TimelineMemory } from "../types/timeline";
import { getRelatedMemoriesForVisibility } from "./get-related-memories";

export function getRelatedVaultMemories(memoryId: string): Promise<TimelineMemory[]> {
  return getRelatedMemoriesForVisibility(memoryId, "vault");
}
