"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { memoryQueryKeys } from "../../constants/query-keys";
import { useCommentComposer } from "../../hooks/use-comment-composer";
import { useMemoryComments } from "../../hooks/use-memory-comments";
import { MemoryCommentComposer } from "../memory-comment-composer";
import { MemoryCommentHistory } from "../memory-comment-history";
import styles from "./memory-comments.module.css";

type MemoryCommentsProps = {
  memoryId: string;
};

const SLOW_FEEDBACK_DELAY = 750;

export function MemoryComments({ memoryId }: Readonly<MemoryCommentsProps>) {
  const { i18n, t } = useTranslation("memories");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSlow, setIsSlow] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const handleUnavailable = useCallback(() => {
    queryClient.removeQueries({ queryKey: memoryQueryKeys.comments(memoryId) });
    router.refresh();
  }, [memoryId, queryClient, router]);
  const history = useMemoryComments(memoryId, handleUnavailable);
  const composer = useCommentComposer(memoryId, handleUnavailable);
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const isInitialLoading = history.isPending && !history.data;

  useEffect(() => {
    if (!isInitialLoading) {
      setIsSlow(false);
      return;
    }

    const timer = window.setTimeout(() => setIsSlow(true), SLOW_FEEDBACK_DELAY);
    return () => window.clearTimeout(timer);
  }, [isInitialLoading]);

  useEffect(() => {
    if (composer.lastOutcome === "success") {
      setAnnouncement(t("detail.comments.added"));
    }
  }, [composer.lastOutcome, t]);

  useEffect(() => {
    if (history.cursorReset) setAnnouncement(t("detail.comments.refreshed"));
  }, [history.cursorReset, t]);

  return (
    <section className={styles.section} aria-labelledby="memory-comments-heading">
      <header className={styles.header}>
        <h2 id="memory-comments-heading">{t("detail.comments.heading")}</h2>
        <p className={styles.description}>{t("detail.comments.description")}</p>
        {isSlow ? <p className={styles.slow}>{t("detail.comments.loading")}</p> : null}
      </header>
      <MemoryCommentComposer composer={composer} />
      <div className={styles.divider} aria-hidden="true" />
      <MemoryCommentHistory
        comments={history.comments}
        error={history.isError ? history.error : null}
        hasNextPage={Boolean(history.hasNextPage)}
        isFetchingNextPage={history.isFetchingNextPage}
        isLoading={isInitialLoading}
        loadedPageCount={history.loadedPageCount}
        locale={locale}
        onLoadMore={() => void history.fetchNextPage()}
        onRetry={() => void history.refetch()}
      />
      <p className={styles.announcement} aria-live="polite" role="status">
        {composer.isSubmitting ? t("detail.comments.adding") : announcement}
      </p>
    </section>
  );
}
