import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemoryComment } from "../types/comment";
import { updateCommentInputSchema } from "./comment-input-validation";
import { MemoryInputError } from "./memory-input-validation";

const updateCommentRowSchema = z
  .object({
    author_display_name: z.string().min(1).nullable(),
    author_user_id: z.uuid().nullable(),
    body: z.string().nullable(),
    comment_id: z.uuid().nullable(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    memory_id: z.uuid().nullable(),
    outcome: z.enum(["completed", "conflict", "invalid", "unavailable"]),
    updated_at: z.string().datetime({ offset: true }).nullable(),
    version: z.number().int().positive().nullable(),
  })
  .strict();

const authorProfileSchema = z.object({
  avatar_url: z.string().url().nullable().catch(null),
});

export class UpdateCommentError extends MemoryInputError {
  constructor(
    message: string,
    fields: Record<string, string>,
    status: 404 | 409,
    readonly code: "conflict" | "unavailable",
  ) {
    super(message, fields, status);
  }
}

function unavailableError(): UpdateCommentError {
  return new UpdateCommentError("This memory is unavailable.", {}, 404, "unavailable");
}

export async function updateComment(
  userId: string,
  memoryId: string,
  commentId: string,
  expectedVersion: number,
  body: string,
): Promise<MemoryComment> {
  const parsed = updateCommentInputSchema.safeParse({ body, commentId, expectedVersion, memoryId });
  if (!parsed.success) {
    const invalidIdentifier = parsed.error.issues.some(
      (issue) => issue.path[0] === "commentId" || issue.path[0] === "memoryId",
    );
    if (invalidIdentifier) throw unavailableError();

    throw new MemoryInputError("Please review the highlighted fields.", {
      [parsed.error.issues[0]?.path[0] === "expectedVersion" ? "form" : "body"]:
        parsed.error.issues[0]?.message ?? "Enter a valid comment.",
    });
  }

  const input = parsed.data;
  const admin = createAdminClient();
  const response = await admin.rpc("update_memory_comment", {
    p_author_user_id: userId,
    p_body: input.body,
    p_comment_id: input.commentId,
    p_expected_version: input.expectedVersion,
    p_memory_id: input.memoryId,
  });
  if (response.error) {
    throw new Error("Unable to update the comment.", { cause: response.error });
  }

  const parsedRow = updateCommentRowSchema.safeParse(response.data?.[0]);
  if (!parsedRow.success) throw new Error("The comment service returned an invalid response.");
  if (parsedRow.data.outcome === "unavailable") throw unavailableError();
  if (parsedRow.data.outcome === "conflict") {
    throw new UpdateCommentError(
      "This comment changed. Refresh it before saving again.",
      {},
      409,
      "conflict",
    );
  }
  if (parsedRow.data.outcome === "invalid") {
    throw new MemoryInputError("Please review the highlighted fields.", {
      body: "Enter a valid comment.",
    });
  }

  const row = parsedRow.data;
  if (
    !row.author_display_name ||
    !row.author_user_id ||
    !row.body ||
    !row.comment_id ||
    !row.created_at ||
    !row.memory_id ||
    !row.updated_at ||
    !row.version
  ) {
    throw new Error("The completed comment outcome is invalid.");
  }

  const profileResult = await admin
    .from("users")
    .select("avatar_url")
    .eq("id", row.author_user_id)
    .maybeSingle();
  if (profileResult.error) {
    throw new Error("Unable to resolve the comment author profile.", {
      cause: profileResult.error,
    });
  }
  const profile = authorProfileSchema.safeParse(profileResult.data);

  return {
    authorAvatarUrl: profile.success ? profile.data.avatar_url : null,
    authorDisplayName: row.author_display_name,
    body: row.body,
    createdAt: row.created_at,
    id: row.comment_id,
    isAuthor: true,
    memoryId: row.memory_id,
    updatedAt: row.updated_at,
    version: row.version,
  };
}
