import type { RootComment } from "@leonly/utils/contracts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactElement, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCommentComposer } from "../../hooks/use-comment-composer";
import type { CommentDeletionOutcome } from "../../hooks/use-comment-deletion";
import { MemoryCommentComposer } from "../memory-comment-composer";
import { MemoryCommentItem } from "../memory-comment-item";
import styles from "./memory-comment-thread.module.css";
import { useCommentReplies } from "./use-comment-replies";

type MemoryCommentThreadProps = {
  comment: RootComment;
  locale: string;
  onDeleteOutcome?: (outcome: CommentDeletionOutcome) => void;
  onUnavailable?: () => void;
};

export function MemoryCommentThread({
  comment,
  locale,
  onDeleteOutcome,
  onUnavailable,
}: Readonly<MemoryCommentThreadProps>): ReactElement {
  const { t } = useTranslation("memories");
  const [expanded, setExpanded] = useState(false);
  const repliesId = useId();
  const composer = useCommentComposer({
    memoryId: comment.memoryId,
    onUnavailable,
    parentCommentId: comment.id,
  });
  const replies = useCommentReplies({
    memoryId: comment.memoryId,
    commentId: comment.id,
    isExpanded: expanded,
  });

  return (
    <li className={styles.thread}>
      {comment.deletedAt !== null ? (
        <p className={styles.deleted}>{t("detail.comments.deleted")}</p>
      ) : (
        <MemoryCommentItem
          comment={comment}
          locale={locale}
          onDeleteOutcome={onDeleteOutcome}
          onUnavailable={onUnavailable}
        />
      )}
      <button
        className={styles.control}
        type="button"
        aria-controls={expanded ? repliesId : undefined}
        aria-expanded={expanded}
        onClick={() => setExpanded((isExpanded) => !isExpanded)}
      >
        {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        {expanded
          ? t("detail.comments.hideReplies")
          : t("detail.comments.showReplies", { count: comment.replyCount })}
      </button>
      {expanded ? (
        <div className={styles.content} id={repliesId}>
          {replies.isPending ? <p role="status">{t("detail.comments.loading")}</p> : null}
          {replies.isError ? (
            <button
              className={styles.control}
              type="button"
              onClick={() =>
                void (replies.isFetchNextPageError ? replies.fetchNextPage() : replies.refetch())
              }
            >
              {t("detail.comments.tryAgain")}
            </button>
          ) : null}
          <ul className={styles.replies}>
            {replies.data?.pages
              .flatMap((page) => page.data)
              .map((reply) =>
                reply.deletedAt === null ? (
                  <li key={reply.id}>
                    <MemoryCommentItem
                      comment={reply}
                      locale={locale}
                      onDeleteOutcome={onDeleteOutcome}
                      onUnavailable={onUnavailable}
                    />
                  </li>
                ) : null,
              )}
          </ul>
          {replies.hasNextPage ? (
            <button
              className={styles.control}
              type="button"
              onClick={() => void replies.fetchNextPage()}
            >
              {t("detail.comments.moreReplies")}
            </button>
          ) : null}
          {comment.deletedAt === null ? (
            <MemoryCommentComposer composer={composer} isReply />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
