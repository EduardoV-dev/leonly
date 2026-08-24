import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

export async function hasActiveSpaceForCurrentUser(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_members")
    .select("id, spaces!inner(id, deleted_at)")
    .is("deleted_at", null)
    .is("spaces.deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    logServerError({ event: "supabase_operation_failed", operation: "check_active_space" }, error);
    throw new Error("Failed to check the active space.");
  }

  return Boolean(data);
}
