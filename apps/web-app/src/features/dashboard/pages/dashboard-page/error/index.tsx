"use client";

import { useTranslation } from "react-i18next";
import styles from "./error.module.css";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export function DashboardError({ reset }: DashboardErrorProps) {
  const { t } = useTranslation("dashboard");

  return (
    <main className={styles.state}>
      <div className={styles.card}>
        <h1>{t("error.heading")}</h1>
        <p>{t("error.description")}</p>
        <button className={styles.retryButton} type="button" onClick={reset}>
          {t("error.retry")}
        </button>
      </div>
    </main>
  );
}
