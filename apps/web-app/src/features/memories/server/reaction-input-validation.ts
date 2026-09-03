import "server-only";

import { z } from "zod";

export const reactionTypeSchema = z.enum(["heart", "laugh", "cry", "star"]);

export const reactionInputSchema = z
  .object({
    memoryId: z.uuid(),
    reactionType: reactionTypeSchema,
  })
  .strict();

export type MemoryReactionType = z.infer<typeof reactionTypeSchema>;
export type ValidatedReactionInput = z.infer<typeof reactionInputSchema>;
