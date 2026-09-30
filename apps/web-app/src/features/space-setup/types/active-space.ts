export type ActiveSpace = {
  active_members: { avatar_url: string | null; display_name: string }[];
  id: string;
  invite_code: string | null;
  invite_code_expires_at: string | null;
  member_names: string[];
  name: string;
  onboarding_completed_at: string | null;
  start_date: string;
};
