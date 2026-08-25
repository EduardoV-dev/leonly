import { Skeleton } from "@/components/ui/skeleton";
import styles from "./loading.module.css";

export function DashboardLoading() {
  return (
    <output className={styles.content} aria-label="Loading dashboard">
      <div className={styles.welcome}>
        <Skeleton className={styles.welcomeTitle} />
        <Skeleton className={styles.welcomeCopy} />
      </div>

      <div className={styles.heroGrid}>
        <div className={styles.milestoneCard}>
          <Skeleton className={styles.eyebrow} />
          <Skeleton className={styles.milestoneTitle} />
          <Skeleton className={styles.milestoneCopy} />
          <Skeleton className={styles.milestoneCopyShort} />
        </div>
        <div className={styles.memberSummary}>
          <div className={styles.memberAvatars}>
            <Skeleton />
            <Skeleton />
          </div>
          <Skeleton className={styles.memberTitle} />
          <Skeleton className={styles.memberCopy} />
        </div>
      </div>

      <div className={styles.summarySection}>
        <Skeleton className={styles.sectionTitle} />
        <Skeleton className={styles.summaryCard} />
      </div>
      <div className={styles.summarySection}>
        <Skeleton className={styles.sectionTitle} />
        <Skeleton className={styles.summaryCard} />
      </div>
    </output>
  );
}
