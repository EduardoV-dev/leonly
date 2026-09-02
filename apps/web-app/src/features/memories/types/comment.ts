export type MemoryComment = {
  authorAvatarUrl: string | null;
  authorDisplayName: string;
  body: string;
  createdAt: string;
  id: string;
  memoryId: string;
};

export type MemoryCommentPage = {
  comments: MemoryComment[];
  cursorReset: boolean;
  nextCursor: string | null;
};
