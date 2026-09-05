import { NextResponse } from "next/server";
import {
  renameActiveSpace,
  renameActiveSpaceRequestSchema,
} from "@/features/settings/server/rename-active-space";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

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

    const payload = renameActiveSpaceRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!payload.success) {
      return NextResponse.json(
        {
          error: "Please review the highlighted fields.",
          fields: { name: "Enter a name between 2 and 100 characters." },
        },
        { status: 400 },
      );
    }

    const result = await renameActiveSpace(payload.data);
    if (result.status === "updated") {
      return NextResponse.json({ name: result.name, updatedAt: result.updatedAt });
    }
    if (result.status === "conflict") {
      return NextResponse.json(
        { code: "conflict", name: result.name, updatedAt: result.updatedAt },
        { status: 409 },
      );
    }
    if (result.status === "invalid") {
      return NextResponse.json(
        {
          error: "Please review the highlighted fields.",
          fields: { name: "Enter a name between 2 and 100 characters." },
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
      { event: "space_name_failed", operation: "rename_active_space" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not update this space name. Please try again." },
      { status: 500 },
    );
  }
}
