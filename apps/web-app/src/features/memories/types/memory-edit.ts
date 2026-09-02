export type MemoryEditPhoto = {
  id: string;
  previewUrl: string | null;
};

export type MemoryEdit = {
  coverPhotoId: string | null;
  description: string | null;
  id: string;
  initialVisibility: "timeline" | "vault";
  location: string | null;
  memoryDate: string;
  photos: MemoryEditPhoto[];
  title: string;
  version: string;
};

export type MemoryEditResult = {
  id: string;
  reused: boolean;
  version: string;
  visibility: "timeline" | "vault";
};
