import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { MAX_COMMENT_LENGTH } from "../constants/comments";

export const commentBodySchema = z.string().transform((value, context) => {
  const normalizedBody = value.trim();
  const length = Array.from(normalizedBody).length;

  if (length === 0) {
    context.addIssue({ code: "custom", message: "Enter a comment." });
  } else if (length > MAX_COMMENT_LENGTH) {
    context.addIssue({
      code: "custom",
      message: "Comment must be 1,000 characters or fewer.",
    });
  }

  return normalizedBody;
});

export const createCommentInputSchema = z
  .object({
    body: commentBodySchema,
    idempotencyKey: z.uuid(),
    memoryId: z.uuid(),
  })
  .strict();

export type ValidatedCreateCommentInput = z.infer<typeof createCommentInputSchema>;

export const updateCommentInputSchema = z
  .object({
    body: commentBodySchema,
    commentId: z.uuid(),
    expectedVersion: z.number().int().positive(),
    memoryId: z.uuid(),
  })
  .strict();

export type ValidatedUpdateCommentInput = z.infer<typeof updateCommentInputSchema>;

export function createCommentRequestFingerprint(memoryId: string, body: string): string {
  return createHash("sha256").update(`${memoryId}:${body}`).digest("hex");
}
