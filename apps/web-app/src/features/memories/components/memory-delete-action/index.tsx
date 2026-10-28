"use client";

import { Trash2 } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteMemory } from "../../hooks/use-delete-memory";
import styles from "./memory-delete-action.module.css";

type MemoryDeleteActionProps = {
  memoryId: string;
  onPendingChange?: (isPending: boolean) => void;
  version: string;
  visibility: "timeline" | "vault";
};

export function MemoryDeleteAction({
  memoryId,
  onPendingChange,
  version,
  visibility,
}: Readonly<MemoryDeleteActionProps>) {
  const { t } = useTranslation("memories");
  const [isOpen, setIsOpen] = useState(false);
  const deletion = useDeleteMemory({ memoryId, version, visibility });

  useEffect(() => onPendingChange?.(deletion.isPending), [deletion.isPending, onPendingChange]);

  useEffect(() => {
    if (deletion.status === "conflict" || deletion.status === "unavailable") setIsOpen(false);
  }, [deletion.status]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (deletion.isPending) return;
    setIsOpen(nextOpen);
    if (!nextOpen) deletion.reset();
  };
  const handleConfirm = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    deletion.remove();
  };
  let statusMessage = "";
  if (deletion.status === "pending") statusMessage = t("detail.delete.pending");
  if (deletion.status === "conflict") statusMessage = t("detail.delete.conflict");
  if (deletion.status === "unavailable") statusMessage = t("detail.delete.unavailable");
  if (deletion.status === "failed") statusMessage = t("detail.delete.failed");
  let confirmLabel = t("detail.delete.confirm");
  if (deletion.isPending) confirmLabel = t("detail.delete.deleting");
  if (deletion.status === "failed") confirmLabel = t("detail.delete.retry");

  return (
    <div className={styles.action}>
      <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogTrigger asChild>
          <button
            aria-label={t("detail.delete.action")}
            className={styles.trigger}
            disabled={deletion.isPending}
            title={t("detail.delete.action")}
            type="button"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className={styles.dialog}>
          <div className={styles.dialogHeading}>
            <span className={styles.warningIcon} aria-hidden="true">
              <Trash2 />
            </span>
            <AlertDialogHeader className={styles.header}>
              <AlertDialogTitle className={styles.title}>
                {t("detail.delete.heading")}
              </AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                {t("detail.delete.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          {statusMessage ? (
            <p className={styles.status} aria-live="polite" role="status">
              {statusMessage}
            </p>
          ) : null}
          <AlertDialogFooter className={styles.footer}>
            <AlertDialogCancel disabled={deletion.isPending} className={styles.cancel}>
              {t("detail.delete.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className={styles.confirm}
              disabled={deletion.isPending}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {!isOpen && statusMessage ? (
        <p className={styles.status} aria-live="polite" role="status">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
