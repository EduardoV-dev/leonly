import { Skeleton } from "@/components/ui/skeleton";
import styles from "./loading.module.css";

const DASHBOARD_SECTIONS = ["timeline", "gallery", "map", "rankings", "vault"];

export function DashboardLoading() {
  return (
    <main className={styles.page}>
      <output className={styles.shell} aria-label="Loading dashboard">
        <div className={styles.mobileHeader}>
          <div className={styles.mobileBrand}>
            <Skeleton className={styles.mobileAvatar} />
            <Skeleton className={styles.mobileLogo} />
          </div>
          <div className={styles.mobileActions}>
            <Skeleton />
            <Skeleton />
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.identity}>
            <div className={styles.sidebarAvatars}>
              <Skeleton />
              <Skeleton />
            </div>
            <Skeleton className={styles.spaceName} />
            <Skeleton className={styles.startedOn} />
          </div>
          <div className={styles.sidebarNavigation}>
            {DASHBOARD_SECTIONS.map((section) => (
              <Skeleton key={section} />
            ))}
          </div>
          <div className={styles.sidebarFooter}>
            <Skeleton />
            <Skeleton />
          </div>
        </aside>

        <section className={styles.content}>
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
        </section>

        <div className={styles.mobileNavigation}>
          {DASHBOARD_SECTIONS.map((section) => (
            <div key={section}>
              <Skeleton className={styles.mobileNavigationIcon} />
              <Skeleton className={styles.mobileNavigationLabel} />
            </div>
          ))}
        </div>
      </output>
    </main>
  );
}
