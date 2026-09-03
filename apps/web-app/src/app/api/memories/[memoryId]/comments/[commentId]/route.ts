import { NextResponse } from "next/server";
import { z } from "zod";
import { MemoryInputError } from "@/features/memories/server/memory-input-validation";
import { UpdateCommentError, updateComment } from "@/features/memories/server/update-comment";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const updateCommentRequestSchema = z
  .object({
    body: z.string(),
    expectedVersion: z.number(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ commentId: string; memoryId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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

    const { commentId, memoryId } = await context.params;
    const payload = updateCommentRequestSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return NextResponse.json({ error: "Please review the highlighted fields." }, { status: 400 });
    }

    const comment = await updateComment(
      user.id,
      memoryId,
      commentId,
      payload.data.expectedVersion,
      payload.data.body,
    );
    return NextResponse.json({ comment });
  } catch (error) {
    if (error instanceof UpdateCommentError) {
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
      { event: "memory_comments_failed", operation: "update_comment" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not update your comment. Please try again." },
      { status: 500 },
    );
  }
}
