import { normalizeInviteCode } from "@/features/space-setup/constants/validation";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { syncCurrentUser } from "@/features/space-setup/server/sync-current-user";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const inviteCodeSchema = z.object({
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

  if (
    message === "No space found for this invite code." ||
    message === "Use a code like LNY-7KLP0."
  ) {
    return 404;
  }

  return 500;
}

export async function POST(request: Request) {
  try {
    const payload = inviteCodeSchema.parse(await request.json());
    await syncCurrentUser();

    if (await getActiveSpaceForCurrentUser()) {
      return NextResponse.json(
        { error: "You already belong to an active space." },
        { status: 409 },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("find_joinable_space", {
      p_invite_code: payload.invite_code,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "We could not validate the invite code. Please try again." },
        { status: getErrorStatus(error.message) },
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || "We could not validate the invite code. Please try again." },
        { status: getErrorStatus(error.message) },
      );
    }

    return NextResponse.json(
      { error: "We could not validate the invite code. Please try again." },
      { status: 500 },
    );
  }
}
