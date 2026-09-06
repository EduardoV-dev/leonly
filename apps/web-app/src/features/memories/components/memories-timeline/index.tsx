"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RECENT_MEMORIES_LIMIT } from "../../constants/timeline";
import { MemoryChronology } from "../memory-chronology";
import styles from "./memories-timeline.module.css";
import { useMemoriesTimeline } from "./use-memories-timeline";

const SLOW_REQUEST_MS = 750;

type MemoriesTimelineProps = Readonly<{
  variant?: "full" | "recent";
}>;

export function MemoriesTimeline({ variant = "full" }: MemoriesTimelineProps) {
  const { t } = useTranslation("memories");
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
      <output className={styles.feedback} aria-label={t("timeline.loading")}>
        <ImageIcon aria-hidden="true" />
        <span>{isSlow ? t("timeline.loadingSlow") : t("timeline.loadingStandard")}</span>
      </output>
    );
  }

  const pages = timelineQuery.data?.pages ?? [];

  if (timelineQuery.isError && pages.length === 0) {
    return (
      <div className={styles.feedback} role="alert">
        <p>{t("timeline.error")}</p>
        <button type="button" onClick={() => void timelineQuery.refetch()}>
          {t("timeline.retry")}
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
        <h3>{t("timeline.empty.heading")}</h3>
        <p>{t("timeline.empty.description")}</p>
      </div>
    );
  }

  return (
    <MemoryChronology
      memories={visibleMemories}
      variant={variant}
      pagination={{
        errorMessage: t("timeline.loadMoreError"),
        hasNextPage: Boolean(timelineQuery.hasNextPage),
        isError: timelineQuery.isFetchNextPageError,
        isLoading: timelineQuery.isFetchingNextPage,
        loadAriaLabel: t("timeline.loadMore"),
        loadLabel: t("vault.actions.loadMore"),
        loadingLabel: t("timeline.loadingMore"),
        onLoad: () => void timelineQuery.fetchNextPage(),
        retryLabel: t("timeline.retryLoadMore"),
      }}
    />
  );
}
