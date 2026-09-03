import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { COMMENT_CURSOR_VERSION, COMMENT_PAGE_SIZE } from "../constants/comments";
import type { MemoryComment, MemoryCommentPage } from "../types/comment";
import { getAvailableMemory } from "./get-available-memory";

const commentCursorSchema = z
  .object({
    createdAt: z.string().datetime({ offset: true }),
    id: z.uuid(),
    memoryId: z.uuid(),
    v: z.literal(COMMENT_CURSOR_VERSION),
  })
  .strict();

const commentRowsSchema = z.array(
  z
    .object({
      author_user_id: z.uuid(),
      body: z.string(),
      created_at: z.string().datetime({ offset: true }),
      id: z.uuid(),
      memory_id: z.uuid(),
      updated_at: z.string().datetime({ offset: true }),
      version: z.number().int().positive(),
    })
    .strict(),
);

const authorRowsSchema = z.array(
  z
    .object({
      display_name: z.string().min(1),
      user_id: z.uuid(),
      users: z
        .object({ avatar_url: z.string().url().nullable().catch(null) })
        .nullable()
        .catch(null),
    })
    .strict(),
);

type CommentCursor = z.infer<typeof commentCursorSchema>;

function encodeCursor(comment: MemoryComment): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: comment.createdAt,
      id: comment.id,
      memoryId: comment.memoryId,
      v: COMMENT_CURSOR_VERSION,
    }),
  ).toString("base64url");
}

function decodeCursor(cursor: string): CommentCursor | null {
  try {
    return commentCursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

function afterCursorFilter(cursor: CommentCursor): string {
  return [
    `created_at.lt.${cursor.createdAt}`,
    `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
  ].join(",");
}

export class GetCommentPageError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 500,
    readonly code: "failed" | "unavailable",
  ) {
    super(message);
  }
}

async function isCurrentCursorAnchor(cursor: CommentCursor, memoryId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_comments")
    .select("id")
    .eq("id", cursor.id)
    .eq("memory_id", memoryId)
    .is("deleted_at", null)
    .eq("created_at", cursor.createdAt)
    .maybeSingle();

  if (error) {
    throw new GetCommentPageError("Failed to load comments.", 500, "failed");
  }

  return data !== null;
}

async function readCommentPage(
  cursor: CommentCursor | null,
  memoryId: string,
  spaceId: string,
): Promise<MemoryCommentPage> {
  const supabase = await createClient();
  let query = supabase
    .from("memory_comments")
    .select("id,memory_id,author_user_id,body,created_at,updated_at,version")
    .eq("memory_id", memoryId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (cursor) {
    query = query.or(afterCursorFilter(cursor));
  }

  const { data, error } = await query.limit(COMMENT_PAGE_SIZE + 1);
  if (error) {
    throw new GetCommentPageError("Failed to load comments.", 500, "failed");
  }

  const rows = commentRowsSchema.parse(data ?? []);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GetCommentPageError("This memory is unavailable.", 404, "unavailable");
  }
  const pageRows = rows.slice(0, COMMENT_PAGE_SIZE);
  const authorIds = [...new Set(pageRows.map((row) => row.author_user_id))];
  const authorsResult = authorIds.length
    ? await supabase
        .from("space_members")
        .select("user_id,display_name,users(avatar_url)")
        .eq("space_id", spaceId)
        .in("user_id", authorIds)
        .is("deleted_at", null)
        .limit(authorIds.length)
    : { data: [], error: null };

  if (authorsResult.error) {
    throw new GetCommentPageError("Failed to load comments.", 500, "failed");
  }

  const authors = authorRowsSchema.parse(authorsResult.data ?? []);
  const authorsById = new Map(authors.map((author) => [author.user_id, author]));
  const comments = pageRows.map((row) => {
    const author = authorsById.get(row.author_user_id);
    if (!author) {
      throw new GetCommentPageError("Failed to load comments.", 500, "failed");
    }

    return {
      authorAvatarUrl: author.users?.avatar_url ?? null,
      authorDisplayName: author.display_name,
      body: row.body,
      createdAt: row.created_at,
      id: row.id,
      isAuthor: row.author_user_id === user.id,
      memoryId: row.memory_id,
      updatedAt: row.updated_at,
      version: row.version,
    };
  });
  const lastComment = comments.at(-1);

  return {
    comments,
    cursorReset: false,
    nextCursor: rows.length > COMMENT_PAGE_SIZE && lastComment ? encodeCursor(lastComment) : null,
  };
}

export async function getCommentPage(
  memoryId: string,
  cursorValue: string | null,
): Promise<MemoryCommentPage> {
  const memory = await getAvailableMemory(memoryId);
  if (!memory) {
    throw new GetCommentPageError("This memory is unavailable.", 404, "unavailable");
  }

  const cursor = cursorValue ? decodeCursor(cursorValue) : null;
  const shouldReset = cursorValue !== null && cursor === null;
  const isCrossMemoryCursor = cursor !== null && cursor.memoryId !== memory.id;

  if (cursor && !isCrossMemoryCursor && !(await isCurrentCursorAnchor(cursor, memory.id))) {
    const firstPage = await readCommentPage(null, memory.id, memory.spaceId);
    return { ...firstPage, cursorReset: true };
  }

  if (isCrossMemoryCursor) {
    const firstPage = await readCommentPage(null, memory.id, memory.spaceId);
    return { ...firstPage, cursorReset: true };
  }

  const page = await readCommentPage(cursor, memory.id, memory.spaceId);
  return shouldReset ? { ...page, cursorReset: true } : page;
}

export const commentCursor = { decode: decodeCursor, encode: encodeCursor };
