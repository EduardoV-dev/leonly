import { createClient } from "@/lib/supabase/server";

export async function hasActiveSpaceForCurrentUser(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_members")
    .select("id, spaces!inner(id, is_active, deleted_at)")
    .eq("is_active", true)
    .eq("spaces.is_active", true)
    .is("spaces.deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to check the active space.");
  }

  return Boolean(data);
}
