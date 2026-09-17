import { NextResponse } from "next/server";
import { hasActiveSpaceForCurrentUser } from "@/features/space-setup/server/has-active-space-for-user";
import {
  AuthenticationRequiredError,
  syncCurrentUser,
} from "@/features/space-setup/server/sync-current-user";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const requestLogger = createRequestLogger(request);

  try {
    await syncCurrentUser();
    if (!(await hasActiveSpaceForCurrentUser())) {
      return NextResponse.json({ error: "You do not belong to an active space." }, { status: 409 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("complete_space_setup");

    if (!error) {
      return NextResponse.json({ completed: true });
    }

    logServerError(
      { event: "supabase_operation_failed", operation: "complete_space_setup" },
      error,
      requestLogger,
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    logServerError(
      { event: "space_setup_completion_failed", operation: "complete_space_setup" },
      error,
      requestLogger,
    );
  }

  return NextResponse.json(
    { error: "We could not complete setup. Please try again." },
    { status: 500 },
  );
}
