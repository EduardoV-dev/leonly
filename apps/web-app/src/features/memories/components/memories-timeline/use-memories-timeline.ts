import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { memoryQueryKeys } from "../../constants/query-keys";
import { RECENT_MEMORIES_LIMIT } from "../../constants/timeline";
import type { TimelinePage } from "../../types/timeline";

const SIGNED_URL_STALE_TIME = 1000 * 60 * 4;

type TimelineVariant = "full" | "recent";
type TimelineQueryKey = ReturnType<typeof memoryQueryKeys.timeline>;

async function fetchTimelinePage(
  cursor: string | null,
  variant: TimelineVariant,
): Promise<TimelinePage> {
  const searchParams = new URLSearchParams();
  if (cursor) {
    searchParams.set("cursor", cursor);
  }
  if (variant === "recent") {
    searchParams.set("limit", String(RECENT_MEMORIES_LIMIT));
  }

  const query = searchParams.size > 0 ? `?${searchParams}` : "";
  const response = await fetch(`/api/memories/timeline${query}`);

  if (!response.ok) {
    throw new Error("Failed to load the memories timeline.");
  }

  return response.json() as Promise<TimelinePage>;
}

export function useMemoriesTimeline(variant: TimelineVariant) {
  return useInfiniteQuery<
    TimelinePage,
    Error,
    InfiniteData<TimelinePage>,
    TimelineQueryKey,
    string | null
  >({
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchTimelinePage(pageParam, variant),
    queryKey: memoryQueryKeys.timeline(variant),
    retry: false,
    staleTime: SIGNED_URL_STALE_TIME,
  });
}
