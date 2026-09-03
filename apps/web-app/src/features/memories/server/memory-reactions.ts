import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemoryInputError } from "./memory-input-validation";
import {
  type MemoryReactionType,
  reactionInputSchema,
  type ValidatedReactionInput,
} from "./reaction-input-validation";

const reactionSummaryRowSchema = z
  .object({
    cry_count: z.number().int().nonnegative().nullable(),
    current_reaction: z.enum(["heart", "laugh", "cry", "star"]).nullable(),
    heart_count: z.number().int().nonnegative().nullable(),
    laugh_count: z.number().int().nonnegative().nullable(),
    outcome: z.enum(["completed", "unavailable"]),
    reaction_members: z
      .object({
        cry: z.array(z.string()),
        heart: z.array(z.string()),
        laugh: z.array(z.string()),
        star: z.array(z.string()),
      })
      .nullable(),
    star_count: z.number().int().nonnegative().nullable(),
  })
  .strict();

export type MemoryReactionSummary = {
  counts: Record<MemoryReactionType, number>;
  currentReaction: MemoryReactionType | null;
  members: Record<MemoryReactionType, string[]>;
};

export class MemoryReactionError extends MemoryInputError {
  constructor(
    message: string,
    status: 404,
    readonly code: "unavailable",
  ) {
    super(message, {}, status);
  }
}

function unavailableError(): MemoryReactionError {
  return new MemoryReactionError("This memory is unavailable.", 404, "unavailable");
}

function parseInput(memoryId: string, reactionType: string): ValidatedReactionInput {
  const parsed = reactionInputSchema.safeParse({ memoryId, reactionType });
  if (!parsed.success) {
    const invalidMemoryId = parsed.error.issues.some((issue) => issue.path[0] === "memoryId");
    if (invalidMemoryId) throw unavailableError();

    throw new MemoryInputError("Please choose a valid reaction.", {
      reactionType: "Choose a valid reaction.",
    });
  }

  return parsed.data;
}

function toSummary(row: z.infer<typeof reactionSummaryRowSchema>): MemoryReactionSummary {
  if (row.outcome === "unavailable") throw unavailableError();
  if (
    row.heart_count === null ||
    row.laugh_count === null ||
    row.cry_count === null ||
    row.star_count === null ||
    row.reaction_members === null
  ) {
    throw new Error("The reaction service returned an invalid completed response.");
  }

  return {
    counts: {
      cry: row.cry_count,
      heart: row.heart_count,
      laugh: row.laugh_count,
      star: row.star_count,
    },
    currentReaction: row.current_reaction,
    members: row.reaction_members,
  };
}

export async function getMemoryReactionSummary(
  userId: string,
  memoryId: string,
): Promise<MemoryReactionSummary> {
  if (!z.uuid().safeParse(memoryId).success) throw unavailableError();

  const response = await createAdminClient().rpc("get_memory_reaction_summary", {
    p_memory_id: memoryId,
    p_user_id: userId,
  });
  if (response.error) {
    throw new Error("Unable to resolve the memory reactions.", { cause: response.error });
  }

  const row = reactionSummaryRowSchema.safeParse(response.data?.[0]);
  if (!row.success) throw new Error("The reaction service returned an invalid response.");
  return toSummary(row.data);
}

export async function toggleMemoryReaction(
  userId: string,
  memoryId: string,
  reactionType: string,
): Promise<MemoryReactionSummary> {
  const input = parseInput(memoryId, reactionType);
  const response = await createAdminClient().rpc("toggle_memory_reaction", {
    p_memory_id: input.memoryId,
    p_reaction_type: input.reactionType,
    p_user_id: userId,
  });
  if (response.error) {
    throw new Error("Unable to update the memory reaction.", { cause: response.error });
  }

  const row = reactionSummaryRowSchema.safeParse(response.data?.[0]);
  if (!row.success) throw new Error("The reaction service returned an invalid response.");
  return toSummary(row.data);
}
