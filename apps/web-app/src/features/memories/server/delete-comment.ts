import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteCommentInputSchema } from "./comment-input-validation";
import { MemoryInputError } from "./memory-input-validation";

const deleteCommentRowSchema = z
  .object({ outcome: z.enum(["completed", "conflict", "unavailable"]) })
  .strict();

export class DeleteCommentError extends MemoryInputError {
  constructor(
    message: string,
    status: 404 | 409,
    readonly code: "conflict" | "unavailable",
  ) {
    super(message, {}, status);
  }
}

function unavailableError(): DeleteCommentError {
  return new DeleteCommentError("This memory is unavailable.", 404, "unavailable");
}

export async function deleteComment(
  userId: string,
  memoryId: string,
  commentId: string,
  expectedVersion: number,
): Promise<void> {
  const parsed = deleteCommentInputSchema.safeParse({ commentId, expectedVersion, memoryId });
  if (!parsed.success) {
    const invalidIdentifier = parsed.error.issues.some(
      (issue) => issue.path[0] === "commentId" || issue.path[0] === "memoryId",
    );
    if (invalidIdentifier) throw unavailableError();

    throw new MemoryInputError("Please reload this memory and try again.", {
      form: "Invalid comment version.",
    });
  }

  const input = parsed.data;
  const response = await createAdminClient().rpc("delete_memory_comment", {
    p_author_user_id: userId,
    p_comment_id: input.commentId,
    p_expected_version: input.expectedVersion,
    p_memory_id: input.memoryId,
  });
  if (response.error) {
    throw new Error("Unable to delete the comment.", { cause: response.error });
  }

  const row = deleteCommentRowSchema.safeParse(response.data?.[0]);
  if (!row.success) throw new Error("The comment service returned an invalid response.");
  if (row.data.outcome === "unavailable") throw unavailableError();
  if (row.data.outcome === "conflict") {
    throw new DeleteCommentError(
      "This comment changed. Refresh it before deleting.",
      409,
      "conflict",
    );
  }
}
