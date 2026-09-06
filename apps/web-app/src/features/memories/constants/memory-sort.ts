export const MEMORY_SORT_OPTIONS = ["newest", "oldest"] as const;

export type MemorySort = (typeof MEMORY_SORT_OPTIONS)[number];

export const DEFAULT_MEMORY_SORT: MemorySort = "newest";
