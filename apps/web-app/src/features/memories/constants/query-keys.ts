import type { MemorySort } from "./memory-sort";

export const memoryQueryKeys = {
  all: ["memories"] as const,
  comments: (memoryId: string) => [...memoryQueryKeys.all, "comments", memoryId] as const,
  reactions: (memoryId: string) => [...memoryQueryKeys.all, "reactions", memoryId] as const,
  timeline: (variant: "full" | "recent", sort?: MemorySort) =>
    sort
      ? ([...memoryQueryKeys.all, "timeline", variant, sort] as const)
      : ([...memoryQueryKeys.all, "timeline", variant] as const),
  vault: (sort?: MemorySort) =>
    sort
      ? ([...memoryQueryKeys.all, "vault", sort] as const)
      : ([...memoryQueryKeys.all, "vault"] as const),
};
