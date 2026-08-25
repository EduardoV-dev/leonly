export type MemoryDetailPhoto = {
  id: string;
  url: string | null;
};

export type MemoryDetail = {
  createdAt: string;
  creatorDisplayName: string;
  description: string | null;
  id: string;
  location: string | null;
  memoryDate: string;
  photos: MemoryDetailPhoto[];
  title: string;
  visibility: "timeline" | "vault";
};
