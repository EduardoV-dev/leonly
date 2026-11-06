import type { MemoryListItem } from "./memory-list";

export type MemoryDetailPhoto = {
  id: string;
  coverUrl: string | null;
  detailUrl: string | null;
};

export type MemoryDetail = {
  id: string;
  title: string;
  memoryDate: string;
  createdAt: string;
  updatedAt: string;
  description: string | null;
  location: string | null;
  visibility: "timeline" | "vault";
  creatorDisplayName: string;
  creatorAvatarUrl: string | null;
  photos: MemoryDetailPhoto[];
  relatedMemories: MemoryListItem[];
};
