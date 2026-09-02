import type { MemoryComment } from "../../types/comment";
import styles from "./memory-comment-item.module.css";

type MemoryCommentItemProps = {
  comment: MemoryComment;
  locale: string;
};

export function MemoryCommentItem({ comment, locale }: Readonly<MemoryCommentItemProps>) {
  const timestamp = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(comment.createdAt));

  return (
    <li className={styles.item} data-has-avatar={Boolean(comment.authorAvatarUrl)}>
      <div className={styles.header}>
        {comment.authorAvatarUrl ? (
          // biome-ignore lint/performance/noImgElement: Profile image URLs are authorized runtime URLs.
          <img
            className={styles.avatar}
            src={comment.authorAvatarUrl}
            alt={comment.authorDisplayName}
          />
        ) : null}
        <p className={styles.metadata}>
          <strong>{comment.authorDisplayName}</strong>
          <time dateTime={comment.createdAt}>{timestamp}</time>
        </p>
      </div>
      <p className={styles.body}>{comment.body}</p>
    </li>
  );
}
