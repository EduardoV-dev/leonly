"use client";

import { LockKeyhole, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./private-vault-error.module.css";

type PrivateVaultErrorProps = {
  onRetry: () => void;
};

export function PrivateVaultError({ onRetry }: Readonly<PrivateVaultErrorProps>) {
  const { t } = useTranslation("memories");

  return (
    <section className={styles.panel} role="alert">
      <LockKeyhole aria-hidden="true" />
      <h1>{t("vault.error.heading")}</h1>
      <p>{t("vault.error.description")}</p>
      <button type="button" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        {t("vault.actions.retry")}
      </button>
    </section>
  );
}
