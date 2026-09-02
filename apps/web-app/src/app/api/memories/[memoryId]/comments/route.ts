import { NextResponse } from "next/server";
import { z } from "zod";
import { CreateCommentError, createComment } from "@/features/memories/server/create-comment";
import { GetCommentPageError, getCommentPage } from "@/features/memories/server/get-comment-page";
import { MemoryInputError } from "@/features/memories/server/memory-input-validation";
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
      { error: "We could not load comments. Please try again." },
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
      return NextResponse.json(
        { code: "unavailable", error: "This memory is unavailable." },
        { status: 404 },
      );
    }

    const { memoryId } = await context.params;
    const payload = commentRequestSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return NextResponse.json({ error: "Please review the highlighted fields." }, { status: 400 });
    }

    const comment = await createComment(
      user.id,
      memoryId,
      request.headers.get("Idempotency-Key") ?? "",
      payload.data.body,
    );
    return NextResponse.json({ comment });
  } catch (error) {
    if (error instanceof CreateCommentError && error.code === "unavailable") {
      return NextResponse.json({ code: "unavailable", error: error.message }, { status: 404 });
    }
    if (error instanceof MemoryInputError) {
      return NextResponse.json(
        {
          code: error instanceof CreateCommentError ? error.code : undefined,
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
      { error: "We could not add your comment. Please try again." },
      { status: 500 },
    );
  }
}
