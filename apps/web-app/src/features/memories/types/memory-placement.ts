export type MemoryPlacementTarget = "timeline" | "vault";

export type MemoryPlacementResult = {
  id: string;
  version: string;
  visibility: MemoryPlacementTarget;
};
