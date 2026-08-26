import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

async function removeStagedPaths(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin.storage.from("memory-photos").remove(paths);
  if (!error) {
    await admin.rpc("mark_memory_photo_staging_cleaned", { p_object_paths: paths });
  }
}

export async function cleanupMemoryCreationAttempt(attemptId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fail_memory_creation_attempt", {
    p_attempt_id: attemptId,
  });
  if (error || !data) {
    return;
  }

  await removeStagedPaths((data as Array<{ object_path: string }>).map((item) => item.object_path));
}

export async function cleanupStaleMemoryPhotoStaging(): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("list_stale_memory_photo_staging");
  if (error || !data) {
    return;
  }

  await removeStagedPaths((data as Array<{ object_path: string }>).map((item) => item.object_path));
}
