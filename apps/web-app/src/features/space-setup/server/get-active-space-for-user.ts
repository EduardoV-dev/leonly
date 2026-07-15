import { createClient } from "@/lib/supabase/server";

type ActiveSpace = {
  id: string;
  invite_code: string | null;
  invite_code_expires_at: string | null;
  name: string;
  start_date: string;
};

export async function getActiveSpaceForUser(userId: string): Promise<ActiveSpace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_members")
    .select(
      `
        spaces!inner (
          id,
          invite_code,
          invite_code_expires_at,
          is_active,
          name,
          start_date
        )
      `,
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("spaces.is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load the active space.");
  }

  return data?.spaces?.[0] ?? null;
}
