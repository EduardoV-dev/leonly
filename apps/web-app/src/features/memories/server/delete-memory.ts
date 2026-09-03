import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeMemoryVersion } from "./memory-version";

const memoryIdSchema = z.uuid();
const deletionRowsSchema = z
  .array(z.object({ outcome: z.enum(["completed", "conflict", "unavailable"]) }).strict())
  .length(1);

export class MemoryDeletionError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409,
    readonly code: "conflict" | "unavailable",
  ) {
    super(message);
  }
}

export class MemoryDeletionInputError extends Error {}

function unavailableError(): MemoryDeletionError {
  return new MemoryDeletionError("This memory is unavailable.", 404, "unavailable");
}

export async function deleteMemory(
  userId: string,
  memoryId: string,
  expectedVersion: string,
): Promise<void> {
  if (!memoryIdSchema.safeParse(memoryId).success) throw unavailableError();

  const expectedUpdatedAt = decodeMemoryVersion(expectedVersion);
  if (!expectedUpdatedAt) throw new MemoryDeletionInputError("Invalid memory version.");

  const response = await createAdminClient().rpc("delete_memory", {
    p_actor_user_id: userId,
    p_expected_updated_at: expectedUpdatedAt,
    p_memory_id: memoryId,
  });
  if (response.error) {
    throw new Error("Unable to delete the memory.", { cause: response.error });
  }

  const rows = deletionRowsSchema.safeParse(response.data);
  if (!rows.success) throw new Error("The memory deletion service returned an invalid response.");

  const { outcome } = rows.data[0];
  if (outcome === "unavailable") throw unavailableError();
  if (outcome === "conflict") {
    throw new MemoryDeletionError(
      "This memory changed. Reload the current version before deleting it.",
      409,
      "conflict",
    );
  }
}
