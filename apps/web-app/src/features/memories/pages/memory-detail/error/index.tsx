"use client";

import { BookHeart, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./memory-detail-error.module.css";

type MemoryDetailErrorProps = {
  onRetry: () => void;
};

export function MemoryDetailError({ onRetry }: Readonly<MemoryDetailErrorProps>) {
  const { t } = useTranslation("memories");

  return (
    <div className={styles.page}>
      <section className={styles.panel} role="alert">
        <span className={styles.icon} aria-hidden="true">
          <BookHeart />
        </span>
        <p className={styles.eyebrow}>{t("detail.error.eyebrow")}</p>
        <h1>{t("detail.error.heading")}</h1>
        <p className={styles.description}>{t("detail.error.description")}</p>
        <button type="button" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          {t("detail.actions.retry")}
        </button>
      </section>
    </div>
  );
}
