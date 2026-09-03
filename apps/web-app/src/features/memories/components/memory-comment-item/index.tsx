import { Pencil } from "lucide-react";
import type { FormEvent } from "react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MAX_COMMENT_LENGTH } from "../../constants/comments";
import { useCommentEditor } from "../../hooks/use-comment-editor";
import type { MemoryComment } from "../../types/comment";
import styles from "./memory-comment-item.module.css";

type MemoryCommentItemProps = {
  comment: MemoryComment;
  locale: string;
  onUnavailable?: () => void;
};

export function MemoryCommentItem({
  comment,
  locale,
  onUnavailable,
}: Readonly<MemoryCommentItemProps>) {
  const { t } = useTranslation("memories");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editor = useCommentEditor({ comment, onUnavailable });
  const timestamp = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(comment.createdAt));
  const error = editor.hasAttemptedSave ? editor.draftState.error : null;

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor.draftState.isValid) textareaRef.current?.focus();
    await editor.save();
    if (!editor.draftState.isValid) textareaRef.current?.focus();
  };

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
        {comment.isAuthor && !editor.isEditing ? (
          <Button
            aria-label={t("detail.comments.edit.action")}
            className={styles.editAction}
            onClick={editor.startEditing}
            size="compact"
          >
            <Pencil aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {editor.isEditing ? (
        <form className={styles.editor} onSubmit={handleSave}>
          <label className={styles.editorLabel} htmlFor={`memory-comment-edit-${comment.id}`}>
            {t("detail.comments.edit.label", { name: comment.authorDisplayName })}
          </label>
          <textarea
            ref={textareaRef}
            id={`memory-comment-edit-${comment.id}`}
            aria-describedby={error ? `memory-comment-edit-error-${comment.id}` : undefined}
            aria-invalid={Boolean(error) || undefined}
            className={styles.textarea}
            disabled={editor.isSaving}
            onChange={(event) => editor.updateDraft(event.target.value)}
            rows={3}
            value={editor.draft}
          />
          <p className={styles.count}>
            {editor.draftState.count} / {MAX_COMMENT_LENGTH}
          </p>
          {error ? (
            <p
              className={styles.validation}
              id={`memory-comment-edit-error-${comment.id}`}
              role="alert"
            >
              {error === "required"
                ? t("detail.comments.required")
                : t("detail.comments.overLimit", {
                    count: editor.draftState.normalizedCount - MAX_COMMENT_LENGTH,
                  })}
            </p>
          ) : null}
          {editor.isConflict ? (
            <div className={styles.conflict} role="alert">
              <p>{t("detail.comments.edit.conflict")}</p>
              <button onClick={() => void editor.refresh()} type="button">
                {t("detail.comments.edit.refresh")}
              </button>
            </div>
          ) : null}
          {editor.submitError ? (
            <p className={styles.validation} role="alert">
              {editor.submitError}
            </p>
          ) : null}
          <div className={styles.editorActions}>
            <Button loading={editor.isSaving} size="compact" type="submit">
              {editor.isSaving ? t("detail.comments.edit.saving") : t("detail.comments.edit.save")}
            </Button>
            <button
              className={styles.cancel}
              disabled={editor.isSaving}
              onClick={editor.cancel}
              type="button"
            >
              {t("detail.comments.edit.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <p className={styles.body}>{comment.body}</p>
      )}
      {editor.lastOutcome === "success" ? (
        <p className={styles.status} aria-live="polite" role="status">
          {t("detail.comments.edit.updated")}
        </p>
      ) : null}
    </li>
  );
}
