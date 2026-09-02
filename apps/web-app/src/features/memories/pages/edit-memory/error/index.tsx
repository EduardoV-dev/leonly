"use client";

import { useTranslation } from "react-i18next";
import styles from "../edit-memory-state.module.css";

type EditMemoryErrorProps = { onRetry: () => void };

export function EditMemoryError({ onRetry }: Readonly<EditMemoryErrorProps>) {
  const { t } = useTranslation("memories");
  return (
    <main className={styles.page}>
      <section className={styles.card} role="alert">
        <p>{t("edit.error.eyebrow")}</p>
        <h1>{t("edit.error.heading")}</h1>
        <span>{t("edit.error.description")}</span>
        <button type="button" onClick={onRetry}>
          {t("detail.actions.retry")}
        </button>
      </section>
    </main>
  );
}
