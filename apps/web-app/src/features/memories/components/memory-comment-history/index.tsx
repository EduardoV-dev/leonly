import { BookOpen, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CommentDeletionOutcome } from "../../hooks/use-comment-deletion";
import type { MemoryComment } from "../../types/comment";
import { MemoryCommentItem } from "../memory-comment-item";
import { MemoryCommentPagination } from "../memory-comment-pagination";
import styles from "./memory-comment-history.module.css";

type MemoryCommentHistoryProps = {
  comments: MemoryComment[];
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  loadedPageCount: number;
  onDeleteOutcome?: (outcome: CommentDeletionOutcome) => void;
  onRetry: () => void;
  onUnavailable?: () => void;
  onLoadMore: () => void;
  locale: string;
};

export function MemoryCommentHistory({
  comments,
  error,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  loadedPageCount,
  onDeleteOutcome,
  locale,
  onLoadMore,
  onRetry,
  onUnavailable,
}: Readonly<MemoryCommentHistoryProps>) {
  const { t } = useTranslation("memories");

  if (isLoading) {
    return (
      <div className={styles.loading} aria-label={t("detail.comments.loadingLabel")} role="status">
        <span className={styles.loadingLine} />
        <span className={`${styles.loadingLine} ${styles.loadingLineShort}`} />
        <span className={`${styles.loadingLine} ${styles.loadingLineLong}`} />
      </div>
    );
  }

  if (error && comments.length === 0) {
    return (
      <div className={styles.error} role="alert">
        <RefreshCw aria-hidden="true" />
        <span>{t("detail.comments.historyError")}</span>
        <button className={styles.retry} onClick={onRetry} type="button">
          {t("detail.comments.tryAgain")}
        </button>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className={styles.empty}>
        <BookOpen aria-hidden="true" />
        <h3>{t("detail.comments.emptyHeading")}</h3>
        <p>{t("detail.comments.emptyDescription")}</p>
      </div>
    );
  }

  return (
    <>
      <ul className={styles.list} aria-label={t("detail.comments.historyLabel")}>
        {comments.map((comment) => (
          <MemoryCommentItem
            key={comment.id}
            comment={comment}
            locale={locale}
            onDeleteOutcome={onDeleteOutcome}
            onUnavailable={onUnavailable}
          />
        ))}
      </ul>
      <MemoryCommentPagination
        endLabel={loadedPageCount > 1 ? t("detail.comments.endOfHistory") : undefined}
        errorLabel={t("detail.comments.loadMoreError")}
        hasError={Boolean(error && comments.length > 0)}
        hasNextPage={hasNextPage}
        isFetching={isFetchingNextPage}
        loadMoreLabel={t("detail.comments.loadEarlier")}
        loadingLabel={t("detail.comments.loadingEarlier")}
        onLoadMore={onLoadMore}
        onRetry={onLoadMore}
        retryLabel={t("detail.comments.tryAgain")}
      />
    </>
  );
}
