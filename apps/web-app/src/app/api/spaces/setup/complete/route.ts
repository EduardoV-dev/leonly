import { NextResponse } from "next/server";
import { SPACE_RPC_ERROR_CODES } from "@/features/space-setup/server/space-rpc-error-codes";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const requestLogger = createRequestLogger(request);

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("complete_space_setup");

    if (!error) {
      return NextResponse.json({ completed: true });
    }

    if (error.code === SPACE_RPC_ERROR_CODES.AUTHENTICATION_REQUIRED) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    if (error.code === SPACE_RPC_ERROR_CODES.NO_ACTIVE_SPACE) {
      return NextResponse.json({ error: "You do not belong to an active space." }, { status: 409 });
    }

    logServerError(
      { event: "supabase_operation_failed", operation: "complete_space_setup" },
      error,
      requestLogger,
    );
  } catch (error) {
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
