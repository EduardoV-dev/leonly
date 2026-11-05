import type { MemoryListPage } from "@leonly/utils/contracts";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { listMemories } from "../../api/list-memories";
import type { MemorySort } from "../../constants/memory-sort";
import { memoryQueryKeys } from "../../constants/query-keys";
import { RECENT_MEMORIES_LIMIT } from "../../constants/timeline";

const SIGNED_URL_STALE_TIME = 1000 * 60 * 4;

type TimelineVariant = "full" | "recent";
type TimelineQueryKey = ReturnType<typeof memoryQueryKeys.timeline>;

export function useMemoriesTimeline(variant: TimelineVariant, sort: MemorySort) {
  return useInfiniteQuery<
    MemoryListPage,
    Error,
    InfiniteData<MemoryListPage>,
    TimelineQueryKey,
    string | null
  >({
    getNextPageParam: (page) => page.meta.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      listMemories({
        visibility: "timeline",
        cursor: pageParam,
        sort,
        limit: variant === "recent" ? RECENT_MEMORIES_LIMIT : undefined,
      }),
    queryKey: memoryQueryKeys.timeline(variant, sort),
    retry: false,
    staleTime: SIGNED_URL_STALE_TIME,
  });
}
