import { NextResponse } from "next/server";
import {
  updateActiveMembershipDisplayName,
  updateActiveMembershipDisplayNameRequestSchema,
} from "@/features/settings/server/update-active-membership-display-name";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const invalidDisplayNameResponse = () =>
  NextResponse.json(
    {
      error: "Please review the highlighted fields.",
      fields: { displayName: "Enter a name between 2 and 100 characters." },
    },
    { status: 400 },
  );

export async function PATCH(request: Request): Promise<NextResponse> {
  const requestLogger = createRequestLogger(request);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const payload = updateActiveMembershipDisplayNameRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!payload.success) {
      return invalidDisplayNameResponse();
    }

    const result = await updateActiveMembershipDisplayName(payload.data);
    if (result.status === "updated") {
      return NextResponse.json({
        displayName: result.displayName,
        updatedAt: result.updatedAt,
      });
    }
    if (result.status === "conflict") {
      return NextResponse.json(
        {
          code: "conflict",
          displayName: result.displayName,
          updatedAt: result.updatedAt,
        },
        { status: 409 },
      );
    }
    if (result.status === "invalid") {
      return invalidDisplayNameResponse();
    }

    return NextResponse.json(
      { code: "unavailable", error: "This membership is unavailable." },
      { status: 404 },
    );
  } catch (error) {
    logServerError(
      {
        event: "membership_display_name_failed",
        operation: "update_active_membership_display_name",
      },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not update this display name. Please try again." },
      { status: 500 },
    );
  }
}
