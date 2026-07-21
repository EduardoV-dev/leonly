import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeInviteCode } from "@/features/space-setup/constants/validation";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { syncCurrentUser } from "@/features/space-setup/server/sync-current-user";
import { createClient } from "@/lib/supabase/server";

const joinSpaceRequestSchema = z.object({
  display_name: z
    .string()
    .trim()
    .max(50, "Use 50 characters or fewer.")
    .refine((value) => value.length === 0 || value.length >= 5, "Use at least 5 characters."),
  invite_code: z
    .string()
    .transform(normalizeInviteCode)
    .refine((value) => /^[a-z]{3}[a-z0-9]{5}$/.test(value), "Use a code like LNY-7KLP0."),
});

function getErrorStatus(message: string) {
  if (message === "Authentication is required.") {
    return 401;
  }

  if (message === "You already belong to an active space.") {
    return 409;
  }

  if (message === "No space found for this invite code.") {
    return 404;
  }

  if (message === "This invite code has expired.") {
    return 410;
  }

  if (message === "Use at least 5 characters." || message === "Use 50 characters or fewer.") {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
  try {
    const payload = joinSpaceRequestSchema.parse(await request.json());
    await syncCurrentUser();

    if (await getActiveSpaceForCurrentUser()) {
      return NextResponse.json(
        { error: "You already belong to an active space." },
        { status: 409 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("join_space", {
      p_display_name: payload.display_name,
      p_invite_code: payload.invite_code,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "We could not join this space. Please try again." },
        { status: getErrorStatus(error.message) },
      );
    }

    return NextResponse.json({ space: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || "We could not join this space. Please try again." },
        { status: getErrorStatus(error.message) },
      );
    }

    return NextResponse.json(
      { error: "We could not join this space. Please try again." },
      { status: 500 },
    );
  }
}
