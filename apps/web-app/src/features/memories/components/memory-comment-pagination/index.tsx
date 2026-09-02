import styles from "./memory-comment-pagination.module.css";

type MemoryCommentPaginationProps = {
  hasNextPage: boolean;
  isFetching: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  hasError: boolean;
  loadMoreLabel: string;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
  endLabel?: string;
};

export function MemoryCommentPagination({
  endLabel,
  errorLabel,
  hasError,
  hasNextPage,
  isFetching,
  loadMoreLabel,
  loadingLabel,
  onLoadMore,
  onRetry,
  retryLabel,
}: Readonly<MemoryCommentPaginationProps>) {
  if (hasError) {
    return (
      <div className={styles.error} role="alert">
        <span>{errorLabel}</span>
        <button className={styles.retry} onClick={onRetry} type="button">
          {retryLabel}
        </button>
      </div>
    );
  }

  if (!hasNextPage) {
    return endLabel ? <p className={styles.end}>{endLabel}</p> : null;
  }

  return (
    <button className={styles.loadMore} disabled={isFetching} onClick={onLoadMore} type="button">
      {isFetching ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {isFetching ? loadingLabel : loadMoreLabel}
    </button>
  );
}
