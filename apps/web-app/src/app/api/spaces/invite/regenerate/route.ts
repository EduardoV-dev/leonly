import { NextResponse } from "next/server";
import { z } from "zod";
import { SPACE_RPC_ERROR_CODES } from "@/features/space-setup/server/space-rpc-error-codes";
import {
  AuthenticationRequiredError,
  syncCurrentUser,
} from "@/features/space-setup/server/sync-current-user";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const regenerationResultSchema = z.discriminatedUnion("status", [
  z.object({
    invite_code: z.string(),
    invite_code_expires_at: z.string(),
    status: z.literal("regenerated"),
  }),
  z.object({ status: z.literal("unavailable") }),
]);

export async function POST(request: Request) {
  const requestLogger = createRequestLogger(request);

  try {
    await syncCurrentUser();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("regenerate_space_invite");

    if (error) {
      if (error.code === SPACE_RPC_ERROR_CODES.AUTHENTICATION_REQUIRED) {
        return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
      }

      logServerError(
        { event: "supabase_operation_failed", operation: "regenerate_space_invite" },
        error,
        requestLogger,
      );
      return NextResponse.json(
        { error: "We could not create a new invite. Please try again." },
        { status: 500 },
      );
    }

    const result = regenerationResultSchema.parse(data);

    if (result.status === "unavailable") {
      return NextResponse.json({ error: "Space not found." }, { status: 404 });
    }

    return NextResponse.json({
      invite_code: result.invite_code,
      invite_code_expires_at: result.invite_code_expires_at,
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    logServerError(
      { event: "invite_regeneration_failed", operation: "regenerate_space_invite" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not create a new invite. Please try again." },
      { status: 500 },
    );
  }
}
