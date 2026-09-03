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
  const statusMessage =
    deletion.status === "pending"
      ? t("detail.delete.pending")
      : deletion.status === "conflict"
        ? t("detail.delete.conflict")
        : deletion.status === "unavailable"
          ? t("detail.delete.unavailable")
          : deletion.status === "failed"
            ? t("detail.delete.failed")
            : "";

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
          <AlertDialogHeader>
            <p className={styles.eyebrow}>{t("detail.delete.eyebrow")}</p>
            <AlertDialogTitle className={styles.title}>
              {t("detail.delete.heading")}
            </AlertDialogTitle>
            <AlertDialogDescription className={styles.description}>
              {t("detail.delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className={styles.status} aria-live="polite" role="status">
            {statusMessage}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletion.isPending} className={styles.cancel}>
              {t("detail.delete.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className={styles.confirm}
              disabled={deletion.isPending}
              onClick={handleConfirm}
            >
              {deletion.status === "failed"
                ? t("detail.delete.retry")
                : deletion.isPending
                  ? t("detail.delete.deleting")
                  : t("detail.delete.confirm")}
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
