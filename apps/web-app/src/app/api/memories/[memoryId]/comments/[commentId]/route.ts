import { NextResponse } from "next/server";
import { z } from "zod";
import { canMutateComment } from "@/features/memories/server/can-mutate-comment";
import { DeleteCommentError, deleteComment } from "@/features/memories/server/delete-comment";
import { MemoryInputError } from "@/features/memories/server/memory-input-validation";
import { UpdateCommentError, updateComment } from "@/features/memories/server/update-comment";
import { privateResourceNotFound } from "@/lib/private-resource-response";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const updateCommentRequestSchema = z
  .object({
    body: z.string(),
    expectedVersion: z.number(),
  })
  .strict();
const deleteCommentRequestSchema = z
  .object({ expectedVersion: z.number().int().positive() })
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
      return privateResourceNotFound();
    }

    const { commentId, memoryId } = await context.params;
    if (!(await canMutateComment(memoryId, commentId))) return privateResourceNotFound();
    const payload = updateCommentRequestSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return NextResponse.json(
        { code: "invalid_request", error: "Please review the highlighted fields." },
        { status: 400 },
      );
    }

    const comment = await updateComment(
      memoryId,
      commentId,
      payload.data.expectedVersion,
      payload.data.body,
    );
    return NextResponse.json({ comment });
  } catch (error) {
    if (error instanceof UpdateCommentError) {
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
      { event: "memory_comments_failed", operation: "update_comment" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      {
        code: "memory_comment_update_failed",
        error: "We could not update your comment. Please try again.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestLogger = createRequestLogger(request);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return privateResourceNotFound();
    }

    const { commentId, memoryId } = await context.params;
    if (!(await canMutateComment(memoryId, commentId))) return privateResourceNotFound();
    const payload = deleteCommentRequestSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return NextResponse.json(
        { code: "invalid_request", error: "Please reload this memory and try again." },
        { status: 400 },
      );
    }

    await deleteComment(memoryId, commentId, payload.data.expectedVersion);
    return NextResponse.json({ deletedCommentId: commentId });
  } catch (error) {
    if (error instanceof DeleteCommentError) {
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
      { event: "memory_comments_failed", operation: "delete_comment" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      {
        code: "memory_comment_delete_failed",
        error: "We could not delete your comment. Please try again.",
      },
      { status: 500 },
    );
  }
}
