export type VaultMemory = {
  coverPhotoUrl: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  location: string | null;
  memoryDate: string;
  title: string;
};

export type VaultPage = {
  cursorReset: boolean;
  memories: VaultMemory[];
  nextCursor: string | null;
};
