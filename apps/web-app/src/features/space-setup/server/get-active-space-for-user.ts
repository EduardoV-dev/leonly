import { createClient } from "@/lib/supabase/server";

type ActiveSpace = {
  id: number;
  invite_code: string | null;
  invite_code_expires_at: string | null;
  name: string;
  onboarding_completed_at: string | null;
  start_date: string;
};

export async function getActiveSpaceForCurrentUser(): Promise<ActiveSpace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_active_space");

  if (error) {
    throw new Error("Failed to load the active space.");
  }

  return data as ActiveSpace | null;
}
