import { Skeleton } from "@/components/ui/skeleton";
import styles from "./loading.module.css";

export function DashboardLoading() {
  return (
    <main className={styles.state}>
      <output className={styles.card} aria-label="Loading dashboard">
        <h1>Opening your shared space</h1>
        <p>Gathering the moments that belong to you.</p>
        <div className={styles.loadingStack}>
          <Skeleton className={styles.loadingLine} />
          <Skeleton className={styles.loadingCard} />
        </div>
      </output>
    </main>
  );
}
