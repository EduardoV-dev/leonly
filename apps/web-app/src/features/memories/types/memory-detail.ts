import type { MemoryReactionSummary } from "./memory-reaction";

export type MemoryDetailPhoto = {
  coverUrl: string | null;
  detailUrl: string | null;
  id: string;
};

export type MemoryDetail = {
  createdAt: string;
  creatorAvatarUrl: string | null;
  creatorDisplayName: string;
  description: string | null;
  id: string;
  location: string | null;
  memoryDate: string;
  photos: MemoryDetailPhoto[];
  reaction: MemoryReactionSummary;
  title: string;
  version: string;
  visibility: "timeline" | "vault";
};
