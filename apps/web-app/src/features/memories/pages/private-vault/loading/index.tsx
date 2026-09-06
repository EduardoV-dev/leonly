"use client";

import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./private-vault-loading.module.css";

const CARD_IDS = ["first", "second", "third", "fourth"];

export function PrivateVaultLoading() {
  const { t } = useTranslation("memories");

  return (
    <output className={styles.page} aria-label={t("vault.loading.label")}>
      <header className={styles.hero}>
        <Skeleton className={styles.seal} />
        <div className={styles.introduction}>
          <Skeleton className={styles.eyebrow} />
          <Skeleton className={styles.title} />
          <Skeleton className={styles.description} />
          <Skeleton className={styles.descriptionShort} />
        </div>
      </header>
      <div className={styles.grid}>
        {CARD_IDS.map((id) => (
          <article className={styles.card} key={id}>
            <Skeleton className={styles.cover} />
            <div className={styles.body}>
              <Skeleton className={styles.metadata} />
              <Skeleton className={styles.cardTitle} />
              <Skeleton className={styles.copy} />
            </div>
          </article>
        ))}
      </div>
    </output>
  );
}
