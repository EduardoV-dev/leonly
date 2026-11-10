"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMemoryDetail } from "./get-current-memory-detail";

type RevalidatePlacementViewsParams = {
  memoryId: string;
  visibility: "timeline" | "vault";
};

export async function revalidatePlacementViews({
  memoryId,
  visibility,
}: RevalidatePlacementViewsParams): Promise<void> {
  const memory = await getCurrentMemoryDetail({ memoryId, visibility });
  if (!memory) throw new Error("Memory unavailable.");

  revalidatePath("/");
  revalidatePath("/timeline");
  revalidatePath("/vault");
  revalidatePath(`/memories/${memoryId}`);
  revalidatePath(`/vault/${memoryId}`);
}
