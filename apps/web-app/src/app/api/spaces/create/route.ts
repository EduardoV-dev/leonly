import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { SPACE_RPC_ERROR_CODES } from "@/features/space-setup/server/space-rpc-error-codes";
import {
  AuthenticationRequiredError,
  syncCurrentUser,
} from "@/features/space-setup/server/sync-current-user";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import { getCalendarDateInTimeZone, parseCalendarDate } from "@/utils/calendar-date";

const createSpaceRequestSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .max(100)
      .refine(
        (value) => value.length === 0 || value.length >= 2,
        "Your name must be at least 2 characters.",
      )
      .nullish()
      .transform((value) => value ?? ""),
    space_name: z.string().trim().min(2, "Space name must be at least 2 characters.").max(100),
    start_date: z
      .string()
      .min(1, "Start date is required.")
      .refine((value) => parseCalendarDate(value) !== null, "Enter a valid start date."),
    timezone: z.string().min(1, "Timezone is required."),
  })
  .superRefine(({ start_date, timezone }, context) => {
    const today = getCalendarDateInTimeZone(timezone);

    if (!today) {
      context.addIssue({ code: "custom", message: "Enter a valid timezone.", path: ["timezone"] });
    } else if (start_date > today) {
      context.addIssue({
        code: "custom",
        message: "The start date cannot be in the future.",
        path: ["start_date"],
      });
    }
  });

const createdSpaceSchema = z.object({
  id: z.number(),
});

export async function POST(request: Request) {
  const requestLogger = createRequestLogger(request);

  try {
    const payload = createSpaceRequestSchema.parse(await request.json());
    await syncCurrentUser();
    const activeSpace = await getActiveSpaceForCurrentUser();

    if (activeSpace) {
      return NextResponse.json(
        { error: "You already belong to an active space." },
        { status: 409 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_space", {
      p_display_name: payload.display_name,
      p_space_name: payload.space_name,
      p_start_date: payload.start_date,
      p_timezone: payload.timezone,
    });

    if (error) {
      if (error.code === SPACE_RPC_ERROR_CODES.ACTIVE_MEMBERSHIP_EXISTS) {
        return NextResponse.json(
          { error: "You already belong to an active space." },
          { status: 409 },
        );
      }

      if (error.code === SPACE_RPC_ERROR_CODES.INVALID_INPUT) {
        return NextResponse.json({ error: "The space details are invalid." }, { status: 400 });
      }

      logServerError(
        { event: "supabase_operation_failed", operation: "create_space" },
        error,
        requestLogger,
      );
      return NextResponse.json(
        { error: "We could not create your space. Please try again." },
        { status: 500 },
      );
    }

    const space = createdSpaceSchema.parse(data);

    return NextResponse.json({ space_id: space.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return NextResponse.json(
        {
          error: issue?.message,
          field: typeof issue?.path[0] === "string" ? issue.path[0] : undefined,
        },
        { status: 400 },
      );
    }

    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    logServerError(
      { event: "space_creation_failed", operation: "create_space" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not create your space. Please try again." },
      { status: 500 },
    );
  }
}
