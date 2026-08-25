import { Skeleton } from "@/components/ui/skeleton";
import styles from "./create-memory-loading.module.css";

export function CreateMemoryLoading() {
  return (
    <output className={styles.page} aria-label="Loading new memory form">
      <Skeleton className={styles.backLink} />
      <header className={styles.intro}>
        <Skeleton className={styles.title} />
        <Skeleton className={styles.copy} />
      </header>
      <div className={styles.form}>
        <section className={styles.field}>
          <Skeleton className={styles.label} />
          <Skeleton className={styles.input} />
        </section>
        <div className={styles.metadata}>
          <section className={styles.field}>
            <Skeleton className={styles.label} />
            <Skeleton className={styles.input} />
          </section>
          <section className={styles.field}>
            <Skeleton className={styles.label} />
            <Skeleton className={styles.input} />
          </section>
        </div>
        <div className={styles.contentGrid}>
          <Skeleton className={styles.photoPicker} />
          <section className={styles.details}>
            <Skeleton className={styles.label} />
            <Skeleton className={styles.textarea} />
            <Skeleton className={styles.placement} />
          </section>
        </div>
        <div className={styles.actions}>
          <Skeleton />
          <Skeleton />
        </div>
      </div>
    </output>
  );
}
