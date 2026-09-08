import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableMemory } from "@/features/memories/server/get-available-memory";
import { MemoryInputError } from "@/features/memories/server/memory-input-validation";
import {
  MemoryReactionError,
  toggleMemoryReaction,
} from "@/features/memories/server/memory-reactions";
import { privateResourceNotFound } from "@/lib/private-resource-response";
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
      return privateResourceNotFound();
    }

    const { memoryId } = await context.params;
    if (!(await getAvailableMemory(memoryId))) return privateResourceNotFound();
    const payload = reactionRequestSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return NextResponse.json(
        { code: "invalid_request", error: "Please choose a valid reaction." },
        { status: 400 },
      );
    }

    const reaction = await toggleMemoryReaction(memoryId, payload.data.reactionType);
    return NextResponse.json({ reaction });
  } catch (error) {
    if (error instanceof MemoryReactionError) {
      if (error.code === "unavailable") return privateResourceNotFound();
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof MemoryInputError) {
      return NextResponse.json(
        { code: error.code, error: error.message, fields: error.fields },
        { status: error.status },
      );
    }

    logServerError(
      { event: "memory_reactions_failed", operation: "toggle_memory_reaction" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      {
        code: "memory_reaction_failed",
        error: "We could not update your reaction. Please try again.",
      },
      { status: 500 },
    );
  }
}
