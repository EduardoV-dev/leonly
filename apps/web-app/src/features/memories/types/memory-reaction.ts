export const MEMORY_REACTION_TYPES = ["heart", "laugh", "cry", "star"] as const;

export type MemoryReactionType = (typeof MEMORY_REACTION_TYPES)[number];

export type MemoryReactionSummary = {
  counts: Record<MemoryReactionType, number>;
  currentReaction: MemoryReactionType | null;
  members: Record<MemoryReactionType, string[]>;
};
