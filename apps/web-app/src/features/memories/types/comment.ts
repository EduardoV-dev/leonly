export type MemoryComment = {
  authorAvatarUrl: string | null;
  authorDisplayName: string;
  body: string;
  createdAt: string;
  id: string;
  isAuthor: boolean;
  memoryId: string;
  updatedAt: string;
  version: number;
};

export type MemoryCommentPage = {
  comments: MemoryComment[];
  cursorReset: boolean;
  nextCursor: string | null;
};
