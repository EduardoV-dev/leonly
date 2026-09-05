"use server";

import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

export type SignOutState = { status: "error" | "idle" };

export async function signOutCurrentSession(_state: SignOutState): Promise<SignOutState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logServerError(
      { event: "supabase_operation_failed", operation: "verify_sign_out_session" },
      userError,
    );
    return { status: "error" };
  }

  if (!user) {
    redirect(APP_ROUTES.AUTH);
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    logServerError({ event: "supabase_operation_failed", operation: "sign_out" }, error);
    return { status: "error" };
  }

  redirect(APP_ROUTES.AUTH);
}
