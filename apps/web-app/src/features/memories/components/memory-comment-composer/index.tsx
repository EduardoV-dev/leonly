import { AlertCircle, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MAX_COMMENT_LENGTH } from "../../constants/comments";
import type { CommentComposerState } from "../../hooks/use-comment-composer";
import styles from "./memory-comment-composer.module.css";

type MemoryCommentComposerProps = {
  composer: CommentComposerState;
};

export function MemoryCommentComposer({ composer }: Readonly<MemoryCommentComposerProps>) {
  const { t } = useTranslation("memories");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const error = composer.hasAttemptedSubmit ? composer.draftState.error : null;
  const hasError = Boolean(error);
  const helperId = "memory-comment-helper";
  const errorId = "memory-comment-error";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!composer.draftState.isValid) textareaRef.current?.focus();
    const result = await composer.submit();
    if (result === "invalid") textareaRef.current?.focus();
  };

  return (
    <form
      id="memory-comment-form"
      aria-label={t("detail.comments.formLabel")}
      className={styles.form}
      noValidate
      onSubmit={handleSubmit}
    >
      <label className={styles.label} htmlFor="memory-comment-input">
        {t("detail.comments.label")}
      </label>
      <textarea
        ref={textareaRef}
        id="memory-comment-input"
        aria-describedby={hasError ? `${helperId} ${errorId}` : helperId}
        aria-invalid={hasError || undefined}
        className={styles.textarea}
        disabled={composer.isSubmitting}
        onBlur={composer.markBlurred}
        onChange={(event) => composer.updateDraft(event.target.value)}
        placeholder={t("detail.comments.placeholder")}
        rows={4}
        value={composer.draft}
      />
      <div className={styles.helperRow}>
        <p className={styles.helper} id={helperId}>
          {error === null && composer.draftState.count >= 900
            ? t("detail.comments.nearLimit", { count: composer.draftState.remaining })
            : t("detail.comments.helper")}
        </p>
        <span className={composer.draftState.remaining < 0 ? styles.overLimit : styles.count}>
          {composer.draftState.count} / {MAX_COMMENT_LENGTH}
        </span>
      </div>
      {hasError ? (
        <p className={styles.validation} id={errorId} role="alert">
          <AlertCircle aria-hidden="true" />
          <span>
            {error === "required"
              ? `${t("detail.comments.errorPrefix")} ${t("detail.comments.required")}`
              : `${t("detail.comments.errorPrefix")} ${t("detail.comments.overLimit", { count: composer.draftState.normalizedCount - MAX_COMMENT_LENGTH })}`}
          </span>
        </p>
      ) : null}
      {composer.submitError ? (
        <div className={styles.submitError} role="alert">
          <p>{composer.submitError}</p>
          <button onClick={() => void composer.submit()} type="button">
            {t("detail.comments.tryAgain")}
          </button>
        </div>
      ) : null}
      <Button
        aria-busy={composer.isSubmitting}
        className={styles.submit}
        disabled={!composer.draftState.isValid}
        loading={composer.isSubmitting}
        size="compact"
        type="submit"
      >
        {composer.isSubmitting ? null : <Send aria-hidden="true" />}
        {composer.isSubmitting ? t("detail.comments.adding") : t("detail.comments.add")}
      </Button>
    </form>
  );
}
