"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import styles from "./memory-comment-delete-dialog.module.css";

type MemoryCommentDeleteDialogProps = {
  errorMessage: string | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
};

export function MemoryCommentDeleteDialog({
  errorMessage,
  isDeleting,
  onCancel,
  onConfirm,
  open,
}: Readonly<MemoryCommentDeleteDialogProps>) {
  const { t } = useTranslation("memories");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("button:last-child")?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-describedby="memory-comment-delete-description"
      aria-labelledby="memory-comment-delete-heading"
      className={styles.dialog}
      onCancel={(event) => {
        if (isDeleting) {
          event.preventDefault();
          return;
        }
        onCancel();
      }}
      onClose={onCancel}
    >
      <div className={styles.content}>
        <div className={styles.dialogHeading}>
          <span className={styles.warningIcon} aria-hidden="true">
            <Trash2 />
          </span>
          <div className={styles.header}>
            <h2 className={styles.title} id="memory-comment-delete-heading">
              {t("detail.comments.delete.heading")}
            </h2>
            <p className={styles.description} id="memory-comment-delete-description">
              {t("detail.comments.delete.description")}
            </p>
          </div>
        </div>
        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button
            className={styles.cancel}
            disabled={isDeleting}
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            {t("detail.comments.delete.cancel")}
          </button>
          <Button
            className={styles.confirm}
            loading={isDeleting}
            onClick={onConfirm}
            size="compact"
          >
            {isDeleting
              ? t("detail.comments.delete.deleting")
              : t("detail.comments.delete.confirm")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
