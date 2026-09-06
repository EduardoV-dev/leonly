"use client";

import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./private-vault-loading.module.css";

const CARD_IDS = ["first", "second", "third", "fourth"];

export function PrivateVaultLoading() {
  const { t } = useTranslation("memories");

  return (
    <output className={styles.page} aria-label={t("vault.loading.label")}>
      <div className={styles.intro}>
        <header className={styles.header}>
          <Skeleton className={styles.leading} />
          <div className={styles.headerContent}>
            <Skeleton className={styles.title} />
            <Skeleton className={styles.description} />
          </div>
        </header>
        <div className={styles.toolbar}>
          <Skeleton className={styles.sortLabel} />
          <Skeleton className={styles.sortControl} />
        </div>
      </div>
      <section className={styles.month}>
        <div className={styles.monthHeading}>
          <Skeleton className={styles.title} />
          <span aria-hidden="true" />
        </div>
        <div className={styles.cards}>
          {CARD_IDS.map((id) => (
            <article className={styles.card} key={id}>
              <div className={styles.summary}>
                <Skeleton className={styles.cover} />
                <div className={styles.body}>
                  <Skeleton className={styles.metadata} />
                  <Skeleton className={styles.cardTitle} />
                  <Skeleton className={styles.copy} />
                  <Skeleton className={styles.copyShort} />
                </div>
              </div>
              <div className={styles.footer}>
                <Skeleton />
                <Skeleton />
              </div>
            </article>
          ))}
        </div>
      </section>
    </output>
  );
}
