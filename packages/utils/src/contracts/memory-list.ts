export type MemoryListItem = {
  id: string;
  title: string;
  memoryDate: string;
  createdAt: string;
  description: string | null;
  location: string | null;
  coverPhotoUrl: string | null;
};

export type MemoryListPage = {
  data: MemoryListItem[];
  meta: {
    nextCursor: string | null;
    cursorReset: boolean;
  };
};
