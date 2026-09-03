import { NextResponse } from "next/server";
import { z } from "zod";
import { MemoryInputError } from "@/features/memories/server/memory-input-validation";
import {
  MemoryReactionError,
  toggleMemoryReaction,
} from "@/features/memories/server/memory-reactions";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const reactionRequestSchema = z
  .object({ reactionType: z.enum(["heart", "laugh", "cry", "star"]) })
  .strict();

type RouteContext = {
  params: Promise<{ memoryId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const requestLogger = createRequestLogger(request);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { code: "unavailable", error: "This memory is unavailable." },
        { status: 404 },
      );
    }

    const { memoryId } = await context.params;
    const payload = reactionRequestSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return NextResponse.json({ error: "Please choose a valid reaction." }, { status: 400 });
    }

    const reaction = await toggleMemoryReaction(user.id, memoryId, payload.data.reactionType);
    return NextResponse.json({ reaction });
  } catch (error) {
    if (error instanceof MemoryReactionError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof MemoryInputError) {
      return NextResponse.json(
        { error: error.message, fields: error.fields },
        { status: error.status },
      );
    }

    logServerError(
      { event: "memory_reactions_failed", operation: "toggle_memory_reaction" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not update your reaction. Please try again." },
      { status: 500 },
    );
  }
}
