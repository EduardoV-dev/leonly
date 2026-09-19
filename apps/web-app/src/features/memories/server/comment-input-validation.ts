import "server-only";

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

export const deleteCommentInputSchema = z
  .object({
    commentId: z.uuid(),
    expectedVersion: z.number().int().positive(),
    memoryId: z.uuid(),
  })
  .strict();

export type ValidatedDeleteCommentInput = z.infer<typeof deleteCommentInputSchema>;
