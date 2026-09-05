"use client";

import { RefreshCw, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./settings-error.module.css";

type SettingsErrorProps = {
  onRetry: () => void;
};

export function SettingsError({ onRetry }: Readonly<SettingsErrorProps>) {
  const { t } = useTranslation("settings");

  return (
    <section className={styles.panel} role="alert">
      <span className={styles.seal} aria-hidden="true">
        <Settings2 />
      </span>
      <p className={styles.eyebrow}>{t("error.eyebrow")}</p>
      <h1>{t("error.heading")}</h1>
      <p className={styles.description}>{t("error.description")}</p>
      <button type="button" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        {t("actions.retry")}
      </button>
    </section>
  );
}
