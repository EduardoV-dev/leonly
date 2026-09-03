import type { MemoryReactionSummary } from "./memory-reaction";

export type TimelineMemory = {
  commentCount: number;
  coverPhotoUrl: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  location: string | null;
  memoryDate: string;
  reaction?: MemoryReactionSummary;
  title: string;
};

export type TimelinePage = {
  cursorReset: boolean;
  memories: TimelineMemory[];
  nextCursor: string | null;
};
