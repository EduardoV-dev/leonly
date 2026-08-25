import { Skeleton } from "@/components/ui/skeleton";
import styles from "./timeline-loading.module.css";

const CARD_IDS = ["first", "second", "third"];

export function TimelineLoading() {
  return (
    <output className={styles.page} aria-label="Loading timeline">
      <header className={styles.header}>
        <Skeleton className={styles.title} />
        <Skeleton className={styles.description} />
      </header>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
        <Skeleton className={styles.sort} />
      </div>
      <section className={styles.month}>
        <div className={styles.monthHeading}>
          <Skeleton />
          <span aria-hidden="true" />
        </div>
        <div className={styles.cards}>
          {CARD_IDS.map((id) => (
            <article key={id} className={styles.card}>
              <Skeleton className={styles.cover} />
              <div className={styles.cardBody}>
                <Skeleton className={styles.metadata} />
                <Skeleton className={styles.cardTitle} />
                <Skeleton className={styles.copy} />
                <Skeleton className={styles.copyShort} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </output>
  );
}
