import { NextResponse } from "next/server";
import {
  updateActiveSpaceStartDate,
  updateActiveSpaceStartDateRequestSchema,
} from "@/features/settings/server/update-active-space-start-date";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request): Promise<NextResponse> {
  const requestLogger = createRequestLogger(request);
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const payload = updateActiveSpaceStartDateRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!payload.success) {
      return NextResponse.json(
        {
          error: "Please review the highlighted fields.",
          fields: { startDate: "Choose a valid date." },
        },
        { status: 400 },
      );
    }

    const result = await updateActiveSpaceStartDate(payload.data);
    if (result.status === "updated") {
      return NextResponse.json({ startDate: result.startDate, updatedAt: result.updatedAt });
    }
    if (result.status === "conflict") {
      return NextResponse.json(
        { code: "conflict", startDate: result.startDate, updatedAt: result.updatedAt },
        { status: 409 },
      );
    }
    if (result.status === "invalid") {
      return NextResponse.json(
        {
          error: "Please review the highlighted fields.",
          fields: { startDate: "Choose a valid date." },
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { code: "unavailable", error: "This shared space is unavailable." },
      { status: 404 },
    );
  } catch (error) {
    logServerError(
      { event: "space_start_date_failed", operation: "update_active_space_start_date" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not update this start date. Please try again." },
      { status: 500 },
    );
  }
}
