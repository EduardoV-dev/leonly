import { NextResponse } from "next/server";
import { z } from "zod";
import { CreateCommentError, createComment } from "@/features/memories/server/create-comment";
import { getAvailableMemory } from "@/features/memories/server/get-available-memory";
import { GetCommentPageError, getCommentPage } from "@/features/memories/server/get-comment-page";
import { MemoryInputError } from "@/features/memories/server/memory-input-validation";
import { privateResourceNotFound } from "@/lib/private-resource-response";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const MAX_COMMENT_CURSOR_LENGTH = 2048;
const commentRequestSchema = z.object({ body: z.string() }).strict();

type RouteContext = {
  params: Promise<{ memoryId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestLogger = createRequestLogger(request);

  try {
    const { memoryId } = await context.params;
    const cursorValue = new URL(request.url).searchParams.get("cursor");
    const cursor =
      cursorValue && cursorValue.length > MAX_COMMENT_CURSOR_LENGTH ? "invalid" : cursorValue;
    return NextResponse.json(await getCommentPage(memoryId, cursor));
  } catch (error) {
    if (error instanceof GetCommentPageError) {
      if (error.code === "unavailable") return privateResourceNotFound();
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: error.status },
      );
    }

    logServerError(
      { event: "memory_comments_failed", operation: "get_comment_page" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { code: "memory_comments_failed", error: "We could not load comments. Please try again." },
      { status: 500 },
    );
  }
}

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
    const payload = commentRequestSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return NextResponse.json(
        { code: "invalid_request", error: "Please review the highlighted fields." },
        { status: 400 },
      );
    }

    const comment = await createComment(memoryId, payload.data.body);
    return NextResponse.json({ comment });
  } catch (error) {
    if (error instanceof CreateCommentError && error.code === "unavailable") {
      return privateResourceNotFound();
    }
    if (error instanceof MemoryInputError) {
      return NextResponse.json(
        {
          code: error.code,
          error: error.message,
          fields: error.fields,
        },
        { status: error.status },
      );
    }

    logServerError(
      { event: "memory_comments_failed", operation: "create_comment" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      {
        code: "memory_comment_create_failed",
        error: "We could not add your comment. Please try again.",
      },
      { status: 500 },
    );
  }
}
