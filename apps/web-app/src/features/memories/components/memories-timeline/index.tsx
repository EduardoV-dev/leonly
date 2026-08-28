"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { RECENT_MEMORIES_LIMIT } from "../../constants/timeline";
import { MemoryChronology } from "../memory-chronology";
import styles from "./memories-timeline.module.css";
import { useMemoriesTimeline } from "./use-memories-timeline";

const SLOW_REQUEST_MS = 750;

type MemoriesTimelineProps = Readonly<{
  variant?: "full" | "recent";
}>;

export function MemoriesTimeline({ variant = "full" }: MemoriesTimelineProps) {
  const timelineQuery = useMemoriesTimeline(variant);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!timelineQuery.isPending) {
      setIsSlow(false);
      return;
    }

    const slowTimer = window.setTimeout(() => setIsSlow(true), SLOW_REQUEST_MS);
    return () => window.clearTimeout(slowTimer);
  }, [timelineQuery.isPending]);

  if (timelineQuery.isPending) {
    return (
      <output className={styles.feedback} aria-label="Loading memories">
        <ImageIcon aria-hidden="true" />
        <span>
          {isSlow ? "This is taking a little longer than usual." : "Opening your memories..."}
        </span>
      </output>
    );
  }

  const pages = timelineQuery.data?.pages ?? [];

  if (timelineQuery.isError && pages.length === 0) {
    return (
      <div className={styles.feedback} role="alert">
        <p>We could not load your memories.</p>
        <button type="button" onClick={() => void timelineQuery.refetch()}>
          Try again
        </button>
      </div>
    );
  }

  let resetPageIndex = -1;
  for (let index = pages.length - 1; index >= 0; index -= 1) {
    if (pages[index].cursorReset) {
      resetPageIndex = index;
      break;
    }
  }
  const visiblePages = resetPageIndex === -1 ? pages : pages.slice(resetPageIndex);
  const memories = visiblePages.flatMap((page) => page.memories);
  const visibleMemories =
    variant === "recent" ? memories.slice(0, RECENT_MEMORIES_LIMIT) : memories;

  if (visibleMemories.length === 0) {
    return (
      <div className={styles.feedback}>
        <ImageIcon aria-hidden="true" />
        <h3>No memories yet</h3>
        <p>Your shared moments will appear here once memories are available.</p>
      </div>
    );
  }

  return (
    <MemoryChronology
      memories={visibleMemories}
      variant={variant}
      pagination={{
        errorMessage: "We could not load more memories.",
        hasNextPage: Boolean(timelineQuery.hasNextPage),
        isError: timelineQuery.isFetchNextPageError,
        isLoading: timelineQuery.isFetchingNextPage,
        loadAriaLabel: "Load more",
        loadLabel: "Load Earlier Memories",
        loadingLabel: "Loading more...",
        onLoad: () => void timelineQuery.fetchNextPage(),
        retryLabel: "Try loading more",
      }}
    />
  );
}
