import { NextResponse } from "next/server";
import { z } from "zod";
import { formatInviteCodeDisplay } from "@/features/space-setup/constants/validation";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { syncCurrentUser } from "@/features/space-setup/server/sync-current-user";
import { createClient } from "@/lib/supabase/server";
import { getCalendarDateInTimeZone, parseCalendarDate } from "@/utils/calendar-date";

const createSpaceRequestSchema = z
  .object({
    display_name: z.string().trim().min(2, "Your name must be at least 2 characters.").max(100),
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
  id: z.any(),
  invite_code: z.string(),
  name: z.string(),
  start_date: z.string(),
});

function getErrorStatus(message: string) {
  if (message === "Authentication is required.") {
    return 401;
  }

  if (message === "You already belong to an active space.") {
    return 409;
  }

  if (
    message === "Space name must be at least 2 characters." ||
    message === "Your name must be at least 2 characters." ||
    message === "The start date cannot be in the future." ||
    message === "Start date is required." ||
    message === "Enter a valid start date." ||
    message === "Timezone is required." ||
    message === "Enter a valid timezone."
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
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
      return NextResponse.json(
        { error: error.message || "We could not create your space. Please try again." },
        { status: getErrorStatus(error.message) },
      );
    }

    const space = createdSpaceSchema.parse(data);

    return NextResponse.json({
      display_invite_code: formatInviteCodeDisplay(space.invite_code),
      space,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || "We could not create your space. Please try again." },
        { status: getErrorStatus(error.message) },
      );
    }

    return NextResponse.json(
      { error: "We could not create your space. Please try again." },
      { status: 500 },
    );
  }
}
