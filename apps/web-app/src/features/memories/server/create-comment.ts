import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemoryComment } from "../types/comment";
import {
  createCommentInputSchema,
  createCommentRequestFingerprint,
} from "./comment-input-validation";
import { MemoryInputError } from "./memory-input-validation";

const commentRpcRowSchema = z
  .object({
    author_display_name: z.string().min(1).nullable(),
    author_user_id: z.uuid().nullable(),
    body: z.string().nullable(),
    comment_id: z.uuid().nullable(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    memory_id: z.uuid().nullable(),
    outcome: z.enum(["completed", "invalid", "mismatch", "unavailable"]),
    space_id: z.uuid().nullable(),
  })
  .strict();
const authorProfileSchema = z.object({
  avatar_url: z.string().url().nullable().catch(null),
});

export type CreateCommentErrorCode = "failed" | "mismatch" | "unavailable";

export class CreateCommentError extends MemoryInputError {
  constructor(
    message: string,
    fields: Record<string, string>,
    status: number,
    readonly code: CreateCommentErrorCode,
  ) {
    super(message, fields, status);
  }
}

function unavailableError(): CreateCommentError {
  return new CreateCommentError("This memory is unavailable.", {}, 404, "unavailable");
}

function toMemoryComment(
  row: z.infer<typeof commentRpcRowSchema>,
  authorAvatarUrl: string | null,
): MemoryComment {
  if (
    row.outcome !== "completed" ||
    !row.author_display_name ||
    !row.body ||
    !row.comment_id ||
    !row.created_at ||
    !row.memory_id
  ) {
    throw new Error("The completed comment outcome is invalid.");
  }

  return {
    authorAvatarUrl,
    authorDisplayName: row.author_display_name,
    body: row.body,
    createdAt: row.created_at,
    id: row.comment_id,
    isAuthor: true,
    memoryId: row.memory_id,
    updatedAt: row.created_at,
    version: 1,
  };
}

export async function createComment(
  userId: string,
  memoryId: string,
  idempotencyKey: string,
  body: string,
): Promise<MemoryComment> {
  const parsed = createCommentInputSchema.safeParse({ body, idempotencyKey, memoryId });
  if (!parsed.success) {
    const invalidMemoryId = parsed.error.issues.some((issue) => issue.path[0] === "memoryId");
    if (invalidMemoryId) {
      throw unavailableError();
    }

    const invalidRequestKey = parsed.error.issues.some(
      (issue) => issue.path[0] === "idempotencyKey",
    );
    if (invalidRequestKey) {
      throw new MemoryInputError("Please try again with a new comment request.", {
        form: "Invalid request key.",
      });
    }

    throw new MemoryInputError("Please review the highlighted fields.", {
      body: parsed.error.issues[0]?.message ?? "Enter a comment.",
    });
  }

  const input = parsed.data;
  const admin = createAdminClient();
  const response = await admin.rpc("create_memory_comment", {
    p_author_user_id: userId,
    p_body: input.body,
    p_idempotency_key: input.idempotencyKey,
    p_memory_id: input.memoryId,
    p_request_fingerprint: createCommentRequestFingerprint(input.memoryId, input.body),
  });

  if (response.error) {
    throw new Error("Unable to create the comment.", { cause: response.error });
  }

  const parsedRow = commentRpcRowSchema.safeParse(response.data?.[0]);
  if (!parsedRow.success) {
    throw new Error("The comment service returned an invalid response.");
  }

  if (parsedRow.data.outcome === "unavailable") {
    throw unavailableError();
  }
  if (parsedRow.data.outcome === "mismatch") {
    throw new MemoryInputError("Please try again with a new comment request.", {
      form: "The request key was already used for different content.",
    });
  }
  if (parsedRow.data.outcome === "invalid") {
    throw new MemoryInputError("Please review the highlighted fields.", {
      body: "Enter a valid comment.",
    });
  }

  const authorProfileResult = await admin
    .from("users")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (authorProfileResult.error) {
    throw new Error("Unable to resolve the comment author profile.", {
      cause: authorProfileResult.error,
    });
  }

  const authorProfile = authorProfileSchema.safeParse(authorProfileResult.data);
  return toMemoryComment(
    parsedRow.data,
    authorProfile.success ? authorProfile.data.avatar_url : null,
  );
}
