import { createClient } from "@/lib/supabase/server";

type ActiveSpaceMember = {
  avatar_url: string | null;
  display_name: string;
};

export type ActiveSpace = {
  active_members: ActiveSpaceMember[];
  id: number;
  invite_code: string | null;
  invite_code_expires_at: string | null;
  member_names: string[];
  name: string;
  onboarding_completed_at: string | null;
  start_date: string | null;
};

export async function getActiveSpaceForCurrentUser(): Promise<ActiveSpace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_active_space");

  if (error) {
    throw new Error("Failed to load the active space.");
  }

  return data as ActiveSpace | null;
}
