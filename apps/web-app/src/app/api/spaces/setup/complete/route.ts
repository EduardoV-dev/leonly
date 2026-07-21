import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getErrorStatus(message: string) {
  if (message === "Authentication is required.") {
    return 401;
  }

  if (message === "You do not belong to an active space.") {
    return 409;
  }

  return 500;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("complete_space_setup");

    if (error) {
      return NextResponse.json(
        { error: error.message || "We could not complete setup. Please try again." },
        { status: getErrorStatus(error.message) },
      );
    }

    return NextResponse.json({ completed: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "We could not complete setup. Please try again.";

    return NextResponse.json({ error: message }, { status: getErrorStatus(message) });
  }
}
