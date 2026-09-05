"use client";

import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./settings-loading.module.css";

const SECTION_IDS = ["shared", "members", "preferences", "account"];

export function SettingsLoading() {
  const { t } = useTranslation("settings");

  return (
    <output className={styles.page} aria-label={t("loading")}>
      <header className={styles.hero}>
        <Skeleton className={styles.eyebrow} />
        <Skeleton className={styles.title} />
        <Skeleton className={styles.description} />
      </header>
      <div className={styles.layout}>
        <aside className={styles.rail}>
          <Skeleton className={styles.summary} />
          <Skeleton className={styles.status} />
          <Skeleton className={styles.vault} />
        </aside>
        <div className={styles.sections}>
          {SECTION_IDS.map((id) => (
            <section className={styles.section} key={id}>
              <Skeleton className={styles.sectionTitle} />
              <Skeleton className={styles.sectionCopy} />
              <Skeleton className={styles.row} />
              <Skeleton className={styles.row} />
            </section>
          ))}
        </div>
      </div>
    </output>
  );
}
