export const memoryQueryKeys = {
  all: ["memories"] as const,
  comments: (memoryId: string) => [...memoryQueryKeys.all, "comments", memoryId] as const,
  reactions: (memoryId: string) => [...memoryQueryKeys.all, "reactions", memoryId] as const,
  timeline: (variant: "full" | "recent") => [...memoryQueryKeys.all, "timeline", variant] as const,
  vault: () => [...memoryQueryKeys.all, "vault"] as const,
};
