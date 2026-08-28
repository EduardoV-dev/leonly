"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { TimelineMemory } from "../../types/timeline";
import { MemorySummaryCard } from "../memory-summary-card";
import styles from "./memory-chronology.module.css";

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

type MemoryMonth = {
  label: string;
  memories: [TimelineMemory, ...TimelineMemory[]];
};

type Pagination = {
  errorMessage: string;
  hasNextPage: boolean;
  isError: boolean;
  isLoading: boolean;
  loadAriaLabel?: string;
  loadLabel: string;
  loadingLabel: string;
  onLoad: () => void;
  retryLabel: string;
};

type MemoryChronologyProps = {
  destination?: "timeline" | "vault";
  memories: TimelineMemory[];
  pagination?: Pagination;
  variant?: "full" | "recent";
};

function groupMemoriesByMonth(memories: TimelineMemory[]): MemoryMonth[] {
  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  const months: MemoryMonth[] = [];

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

export function MemoryChronology({
  destination = "timeline",
  memories,
  pagination,
  variant = "full",
}: Readonly<MemoryChronologyProps>) {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const activeMonthVariants = shouldReduceMotion ? reducedMotionVariants : monthVariants;
  const months = groupMemoriesByMonth(memories);

  return (
    <div className={styles.timeline} aria-live="polite">
      {months.map((month, monthIndex) => (
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
          <div className={variant === "recent" ? styles.recentCards : styles.monthCards}>
            {month.memories.map((memory, index) => (
              <MemorySummaryCard
                destination={destination}
                entryIndex={index}
                key={memory.id}
                memory={memory}
                variant={variant === "recent" ? "recent" : "timeline"}
              />
            ))}
          </div>
        </motion.section>
      ))}
      {variant === "full" && pagination?.hasNextPage ? (
        <div className={styles.loadMore}>
          {pagination.isError ? <p role="alert">{pagination.errorMessage}</p> : null}
          <button
            type="button"
            disabled={pagination.isLoading}
            onClick={pagination.onLoad}
            aria-label={
              pagination.isError
                ? pagination.retryLabel
                : (pagination.loadAriaLabel ?? pagination.loadLabel)
            }
          >
            {pagination.isLoading
              ? pagination.loadingLabel
              : pagination.isError
                ? pagination.retryLabel
                : pagination.loadLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
