export type TimelineMemory = {
  coverPhotoUrl: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  location: string | null;
  memoryDate: string;
  title: string;
};

export type TimelinePage = {
  cursorReset: boolean;
  memories: TimelineMemory[];
  nextCursor: string | null;
};
