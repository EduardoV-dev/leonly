"use client";

import { ImageIcon } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useState } from "react";
import { RECENT_MEMORIES_LIMIT } from "../../constants/timeline";
import type { TimelineMemory } from "../../types/timeline";
import { MemorySummaryCard } from "../memory-summary-card";
import styles from "./memories-timeline.module.css";
import { useMemoriesTimeline } from "./use-memories-timeline";

const SLOW_REQUEST_MS = 750;

const monthVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: Math.min(index, 5) * 0.04,
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

type MemoriesTimelineProps = Readonly<{
  variant?: "full" | "recent";
}>;

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

export function MemoriesTimeline({ variant = "full" }: MemoriesTimelineProps) {
  const timelineQuery = useMemoriesTimeline(variant);
  const [isSlow, setIsSlow] = useState(false);
  const shouldReduceMotion = Boolean(useReducedMotion());
  const activeMonthVariants = shouldReduceMotion ? reducedMotionVariants : monthVariants;

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

  const months = groupMemoriesByMonth(visibleMemories);

  return (
    <div className={styles.timeline} aria-live="polite">
      {months.map((month, monthIndex) => {
        return (
          <motion.section
            className={styles.month}
            key={month.label}
            variants={activeMonthVariants}
            custom={monthIndex}
            initial="hidden"
            whileInView="visible"
            viewport={{ amount: 0.15, once: true }}
          >
            <div className={styles.monthHeading}>
              <h2>{month.label}</h2>
              <span aria-hidden="true" />
            </div>
            {variant === "recent" ? (
              <div className={styles.recentCards}>
                {month.memories.map((memory, index) => (
                  <MemorySummaryCard
                    key={memory.id}
                    memory={memory}
                    variant="recent"
                    entryIndex={index}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.monthCards}>
                {month.memories.map((memory, index) => (
                  <MemorySummaryCard
                    key={memory.id}
                    memory={memory}
                    variant="timeline"
                    entryIndex={index}
                  />
                ))}
              </div>
            )}
          </motion.section>
        );
      })}
      {variant === "full" && timelineQuery.hasNextPage ? (
        <div className={styles.loadMore}>
          {timelineQuery.isFetchNextPageError ? (
            <p role="alert">We could not load more memories.</p>
          ) : null}
          <button
            type="button"
            disabled={timelineQuery.isFetchingNextPage}
            onClick={() => void timelineQuery.fetchNextPage()}
            aria-label={timelineQuery.isFetchNextPageError ? "Try loading more" : "Load more"}
          >
            {timelineQuery.isFetchingNextPage
              ? "Loading more..."
              : timelineQuery.isFetchNextPageError
                ? "Try loading more"
                : "Load Earlier Memories"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
