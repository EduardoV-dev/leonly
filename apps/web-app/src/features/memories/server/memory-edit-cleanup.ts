import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type ObjectPathRow = { object_path: string };
const STORAGE_REMOVE_BATCH_SIZE = 1000;

async function removePaths(paths: string[], markRpc: string): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  for (let offset = 0; offset < paths.length; offset += STORAGE_REMOVE_BATCH_SIZE) {
    const batch = paths.slice(offset, offset + STORAGE_REMOVE_BATCH_SIZE);
    const admin = createAdminClient();
    const { error } = await admin.storage.from("memory-photos").remove(batch);
    if (!error) {
      await admin.rpc(markRpc, { p_object_paths: batch });
    }
  }
}

export async function cleanupMemoryEditAttempt(attemptId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fail_memory_edit_attempt", {
    p_attempt_id: attemptId,
  });
  if (!error && data) {
    await removePaths(
      (data as ObjectPathRow[]).map((row) => row.object_path),
      "mark_memory_edit_staging_cleaned",
    );
  }
}

export async function cleanupStaleMemoryEdits(): Promise<void> {
  const admin = createAdminClient();
  const [staging, removed] = await Promise.all([
    admin.rpc("list_stale_memory_edit_staging"),
    admin.rpc("list_memory_photo_cleanup"),
  ]);

  if (!staging.error && staging.data) {
    await removePaths(
      (staging.data as ObjectPathRow[]).map((row) => row.object_path),
      "mark_memory_edit_staging_cleaned",
    );
  }
  if (!removed.error && removed.data) {
    await removePaths(
      (removed.data as ObjectPathRow[]).map((row) => row.object_path),
      "mark_memory_photo_cleanup_completed",
    );
  }
}
