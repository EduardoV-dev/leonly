"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { RECENT_MEMORIES_LIMIT } from "../../constants/timeline";
import type { TimelineMemory, TimelinePage } from "../../types/timeline";
import { MemorySummaryCard } from "../memory-summary-card";
import styles from "./memories-timeline.module.css";

const SLOW_REQUEST_MS = 750;

type MemoriesTimelineProps = Readonly<{
  variant?: "full" | "recent";
}>;

type TimelineState = {
  isAppending: boolean;
  isInitialLoading: boolean;
  isSlow: boolean;
  memories: TimelineMemory[];
  nextCursor: string | null;
  pageError: boolean;
  nextPageError: boolean;
};

const initialState: TimelineState = {
  isAppending: false,
  isInitialLoading: true,
  isSlow: false,
  memories: [],
  nextCursor: null,
  nextPageError: false,
  pageError: false,
};

type TimelineMonth = {
  label: string;
  memories: [TimelineMemory, ...TimelineMemory[]];
};

function groupMemoriesByMonth(memories: TimelineMemory[]): TimelineMonth[] {
  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  const months: TimelineMonth[] = [];

  for (const memory of memories) {
    const label = monthFormatter.format(new Date(`${memory.memoryDate}T00:00:00`));
    const currentMonth = months.at(-1);

    if (currentMonth?.label === label) {
      currentMonth.memories.push(memory);
    } else {
      months.push({ label, memories: [memory] });
    }
  }

  return months;
}

async function fetchTimeline(cursor: string | null, limit: number | null): Promise<TimelinePage> {
  const searchParams = new URLSearchParams();
  if (cursor) {
    searchParams.set("cursor", cursor);
  }
  if (limit !== null) {
    searchParams.set("limit", String(limit));
  }

  const query = searchParams.size > 0 ? `?${searchParams}` : "";
  const response = await fetch(`/api/memories/timeline${query}`);

  if (!response.ok) {
    throw new Error("Failed to load the memories timeline.");
  }

  return response.json() as Promise<TimelinePage>;
}

export function MemoriesTimeline({ variant = "full" }: MemoriesTimelineProps) {
  const [state, setState] = useState<TimelineState>(initialState);
  const requestId = useRef(0);

  const loadPage = useEffectEvent(async (cursor: string | null, append: boolean) => {
    const currentRequestId = ++requestId.current;
    const slowTimer = window.setTimeout(() => {
      if (requestId.current === currentRequestId) {
        setState((current) => ({ ...current, isSlow: true }));
      }
    }, SLOW_REQUEST_MS);

    setState((current) =>
      append
        ? { ...current, isAppending: true, isSlow: false, nextPageError: false }
        : {
            ...current,
            isInitialLoading: true,
            isSlow: false,
            nextPageError: false,
            pageError: false,
          },
    );

    try {
      const page = await fetchTimeline(cursor, variant === "recent" ? RECENT_MEMORIES_LIMIT : null);
      if (requestId.current !== currentRequestId) {
        return;
      }

      setState((current) => ({
        ...current,
        isAppending: false,
        isInitialLoading: false,
        isSlow: false,
        memories:
          append && !page.cursorReset ? [...current.memories, ...page.memories] : page.memories,
        nextCursor: page.nextCursor,
      }));
    } catch {
      if (requestId.current === currentRequestId) {
        setState((current) =>
          append
            ? { ...current, isAppending: false, isSlow: false, nextPageError: true }
            : { ...current, isInitialLoading: false, isSlow: false, pageError: true },
        );
      }
    } finally {
      window.clearTimeout(slowTimer);
    }
  });

  const refresh = useEffectEvent(() => loadPage(null, false));

  useEffect(() => {
    void loadPage(null, false);

    const handlePageShow = () => void refresh();
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  if (state.isInitialLoading) {
    return (
      <output className={styles.feedback} aria-label="Loading memories">
        <ImageIcon aria-hidden="true" />
        <span>
          {state.isSlow ? "This is taking a little longer than usual." : "Opening your memories..."}
        </span>
      </output>
    );
  }

  if (state.pageError) {
    return (
      <div className={styles.feedback} role="alert">
        <p>We could not load your memories.</p>
        <button type="button" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  }

  if (state.memories.length === 0) {
    return (
      <div className={styles.feedback}>
        <ImageIcon aria-hidden="true" />
        <h3>No memories yet</h3>
        <p>Your shared moments will appear here once memories are available.</p>
      </div>
    );
  }

  const visibleMemories =
    variant === "recent" ? state.memories.slice(0, RECENT_MEMORIES_LIMIT) : state.memories;
  const months = groupMemoriesByMonth(visibleMemories);

  return (
    <div className={styles.timeline} aria-live="polite">
      {months.map((month) => {
        return (
          <section className={styles.month} key={month.label}>
            <div className={styles.monthHeading}>
              <h2>{month.label}</h2>
              <span aria-hidden="true" />
            </div>
            {variant === "recent" ? (
              <div className={styles.recentCards}>
                {month.memories.map((memory) => (
                  <MemorySummaryCard key={memory.id} memory={memory} variant="recent" />
                ))}
              </div>
            ) : (
              <div className={styles.monthCards}>
                {month.memories.map((memory) => (
                  <MemorySummaryCard key={memory.id} memory={memory} variant="timeline" />
                ))}
              </div>
            )}
          </section>
        );
      })}
      {variant === "full" && state.nextCursor ? (
        <div className={styles.loadMore}>
          {state.nextPageError ? <p role="alert">We could not load more memories.</p> : null}
          <button
            type="button"
            disabled={state.isAppending}
            onClick={() => void loadPage(state.nextCursor, true)}
            aria-label={state.nextPageError ? "Try loading more" : "Load more"}
          >
            {state.isAppending
              ? "Loading more..."
              : state.nextPageError
                ? "Try loading more"
                : "Load Earlier Memories"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
