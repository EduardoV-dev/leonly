import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

function getDisplayName(user: {
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
}) {
  const candidates = [
    user.user_metadata?.name,
    user.user_metadata?.full_name,
    user.email?.split("@")[0],
  ];

  return (
    candidates
      .find((candidate) => {
        const length = candidate?.trim().length ?? 0;

        return length > 0 && length <= 100;
      })
      ?.trim() ?? "Leonly User"
  );
}

export async function syncCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logServerError(
      { event: "supabase_operation_failed", operation: "get_current_user" },
      userError,
    );
    throw new Error("Failed to load the current user.");
  }

  if (!user) {
    throw new AuthenticationRequiredError();
  }

  const { error } = await supabase.from("users").upsert({
    avatar_url: user.user_metadata?.avatar_url ?? null,
    deleted_at: null,
    email: user.email,
    id: user.id,
    name: getDisplayName(user),
  });

  if (error) {
    logServerError({ event: "supabase_operation_failed", operation: "sync_current_user" }, error);
    throw new Error("Failed to sync the current user.");
  }

  return user;
}
