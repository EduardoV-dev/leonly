import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const CLEANUP_BATCH_SIZE = 100;

type CleanupResource = {
  id: number;
  resource_kind: string;
  resource_locator: string;
};

export async function cleanupResources(): Promise<void> {
  const admin = createAdminClient();
  const claimed = await admin.rpc("claim_resource_cleanup", {
    p_batch_size: CLEANUP_BATCH_SIZE,
  });
  if (claimed.error || !claimed.data) return;

  const resources = claimed.data as CleanupResource[];
  const supported = resources.filter((resource) => resource.resource_kind === "storage_object");
  const unsupported = resources.filter((resource) => resource.resource_kind !== "storage_object");
  if (unsupported.length > 0) {
    await admin.rpc("fail_resource_cleanup", {
      p_failure_code: "unsupported_resource_kind",
      p_ids: unsupported.map((resource) => resource.id),
    });
  }
  if (supported.length === 0) return;

  const removed = await admin.storage
    .from("memory-photos")
    .remove(supported.map((resource) => resource.resource_locator));
  await admin.rpc(removed.error ? "fail_resource_cleanup" : "complete_resource_cleanup", {
    ...(removed.error ? { p_failure_code: "storage_delete_failed" } : {}),
    p_ids: supported.map((resource) => resource.id),
  });
}
