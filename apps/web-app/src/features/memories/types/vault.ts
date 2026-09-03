import type { MemoryReactionSummary } from "./memory-reaction";

export type VaultMemory = {
  commentCount: number;
  coverPhotoUrl: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  location: string | null;
  memoryDate: string;
  reaction: MemoryReactionSummary;
  title: string;
};

export type VaultPage = {
  cursorReset: boolean;
  memories: VaultMemory[];
  nextCursor: string | null;
};
