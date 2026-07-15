import { createClient } from "@/lib/supabase/server";

function getDisplayName(user: {
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
}) {
  return (
    user?.user_metadata?.name ??
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "Leonly User"
  );
}

export async function syncCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication is required.");
  }

  const { error } = await supabase.from("users").upsert({
    avatar_url: user.user_metadata?.avatar_url ?? null,
    email: user.email,
    id: user.id,
    is_active: true,
    name: getDisplayName(user),
  });

  if (error) {
    throw new Error("Failed to sync the current user.");
  }

  return user;
}
