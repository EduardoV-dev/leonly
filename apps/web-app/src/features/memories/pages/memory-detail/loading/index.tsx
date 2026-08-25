"use client";

import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./memory-detail-loading.module.css";

export function MemoryDetailLoading() {
  const { t } = useTranslation("memories");

  return (
    <output className={styles.page} aria-label={t("detail.loading")}>
      <Skeleton className={styles.backLink} />
      <div className={styles.spread}>
        <div>
          <Skeleton className={styles.photo} />
          <div className={styles.thumbnails}>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        </div>
        <div className={styles.story}>
          <Skeleton className={styles.metadata} />
          <Skeleton className={styles.title} />
          <Skeleton className={styles.titleShort} />
          <Skeleton className={styles.pill} />
          <Skeleton className={styles.copy} />
          <Skeleton className={styles.copy} />
          <Skeleton className={styles.copyShort} />
          <div className={styles.creator}>
            <Skeleton />
            <Skeleton />
          </div>
        </div>
      </div>
    </output>
  );
}
