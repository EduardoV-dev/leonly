export const memoryQueryKeys = {
  all: ["memories"] as const,
  timeline: (variant: "full" | "recent") => [...memoryQueryKeys.all, "timeline", variant] as const,
};
