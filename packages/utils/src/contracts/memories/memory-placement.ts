export type MemoryPlacementRequest = {
  visibility: "timeline" | "vault";
  lastKnownUpdatedAt: string;
};

export type MemoryPlacementResult = {
  id: string;
  visibility: MemoryPlacementRequest["visibility"];
  updatedAt: string;
};
