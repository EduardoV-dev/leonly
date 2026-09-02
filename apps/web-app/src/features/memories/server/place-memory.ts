import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemoryPlacementResult, MemoryPlacementTarget } from "../types/memory-placement";
import { decodeMemoryVersion, encodeMemoryVersion } from "./memory-version";

const memoryIdSchema = z.uuid();
const placementRowSchema = z.object({
  memory_id: z.uuid().nullable(),
  outcome: z.enum(["completed", "conflict", "unavailable"]),
  result_updated_at: z.string().nullable(),
  result_visibility: z.enum(["timeline", "vault"]).nullable(),
});

export class MemoryPlacementError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409,
    readonly code: "conflict" | "unavailable",
  ) {
    super(message);
  }
}

export class MemoryPlacementInputError extends Error {}

export async function placeMemory(
  userId: string,
  memoryId: string,
  targetVisibility: MemoryPlacementTarget,
  expectedVersion: string,
): Promise<MemoryPlacementResult> {
  if (!memoryIdSchema.safeParse(memoryId).success) {
    throw new MemoryPlacementError("This memory is unavailable.", 404, "unavailable");
  }

  const expectedUpdatedAt = decodeMemoryVersion(expectedVersion);
  if (!expectedUpdatedAt) {
    throw new MemoryPlacementInputError("Invalid memory version.");
  }

  const admin = createAdminClient();
  const response = await admin.rpc("place_memory", {
    p_actor_user_id: userId,
    p_expected_updated_at: expectedUpdatedAt,
    p_memory_id: memoryId,
    p_target_visibility: targetVisibility,
  });
  const row = placementRowSchema.safeParse(response.data?.[0]);
  if (response.error) {
    throw new Error("Unable to place the memory.", { cause: response.error });
  }
  if (!row.success) {
    throw new Error("Unable to place the memory.");
  }
  if (row.data.outcome === "unavailable") {
    throw new MemoryPlacementError("This memory is unavailable.", 404, "unavailable");
  }
  if (row.data.outcome === "conflict") {
    throw new MemoryPlacementError(
      "This memory changed. Reload the current version before moving it.",
      409,
      "conflict",
    );
  }
  if (!row.data.memory_id || !row.data.result_updated_at || !row.data.result_visibility) {
    throw new Error("The completed placement outcome is invalid.");
  }

  return {
    id: row.data.memory_id,
    version: encodeMemoryVersion(row.data.result_updated_at),
    visibility: row.data.result_visibility,
  };
}
