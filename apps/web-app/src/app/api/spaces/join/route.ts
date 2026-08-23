import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createLockedInviteResponse,
  INVITE_UNAVAILABLE_MESSAGE,
  parseSpaceInviteResult,
} from "@/features/space-setup/server/space-invite-result";
import { SPACE_RPC_ERROR_CODES } from "@/features/space-setup/server/space-rpc-error-codes";
import {
  AuthenticationRequiredError,
  syncCurrentUser,
} from "@/features/space-setup/server/sync-current-user";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const joinSpaceRequestSchema = z.object({
  display_name: z
    .string()
    .nullish()
    .transform((value) => value ?? ""),
  invite_code: z.string(),
});

export async function POST(request: Request) {
  const requestLogger = createRequestLogger(request);
  const requestResult = joinSpaceRequestSchema.safeParse(await request.json().catch(() => null));

  if (!requestResult.success) {
    return NextResponse.json({ error: "Enter an invite code." }, { status: 400 });
  }

  try {
    await syncCurrentUser();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("process_space_invite", {
      p_display_name: requestResult.data.display_name,
      p_invite_code: requestResult.data.invite_code,
      p_redeem: true,
    });

    if (error) {
      if (error.code === SPACE_RPC_ERROR_CODES.AUTHENTICATION_REQUIRED) {
        return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
      }

      logServerError(
        { event: "supabase_operation_failed", operation: "redeem_space_invite" },
        error,
        requestLogger,
      );
      return NextResponse.json(
        { error: "We could not join this space. Please try again." },
        { status: 500 },
      );
    }

    const result = parseSpaceInviteResult(data);

    if (result.status === "joined") {
      return NextResponse.json({ space_id: result.space_id });
    }

    if (result.status === "locked") {
      return createLockedInviteResponse(result.retry_after);
    }

    if (result.status === "malformed") {
      return NextResponse.json(
        { error: "The format of the code provided is invalid." },
        { status: 400 },
      );
    }

    if (result.status === "invalid_name") {
      return NextResponse.json(
        {
          error: "Your name must contain 2 to 100 characters.",
          field: "display_name",
        },
        { status: 400 },
      );
    }

    if (result.status === "unavailable") {
      return NextResponse.json({ error: INVITE_UNAVAILABLE_MESSAGE }, { status: 404 });
    }

    throw new Error("Unexpected invite redemption result.");
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    logServerError(
      { event: "invite_redemption_failed", operation: "redeem_space_invite" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not join this space. Please try again." },
      { status: 500 },
    );
  }
}
