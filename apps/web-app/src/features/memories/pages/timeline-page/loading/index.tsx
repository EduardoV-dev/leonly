"use client";

import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./timeline-loading.module.css";

const CARD_IDS = ["first", "second", "third"];

export function TimelineLoading() {
  const { t } = useTranslation("memories");

  return (
    <output className={styles.page} aria-label={t("timeline.loadingPage")}>
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
          <Skeleton />
          <span aria-hidden="true" />
        </div>
        <div className={styles.cards}>
          {CARD_IDS.map((id) => (
            <article key={id} className={styles.card}>
              <div className={styles.summary}>
                <Skeleton className={styles.cover} />
                <div className={styles.cardBody}>
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
