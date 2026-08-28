import "server-only";

import type { MemoryDetail } from "../types/memory-detail";
import { getMemoryDetailForVisibility } from "./get-memory-detail";

export function getVaultMemoryDetail(memoryId: string): Promise<MemoryDetail | null> {
  return getMemoryDetailForVisibility(memoryId, "vault");
}
