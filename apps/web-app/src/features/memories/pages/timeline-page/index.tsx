import { ChevronDown, Heart } from "lucide-react";
import { MemoriesTimeline } from "../../components/memories-timeline";
import styles from "./timeline-page.module.css";

export function TimelinePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.eyebrow}>Our Timeline</h1>
        <p className={styles.description}>
          A curated collection of our shared moments, carefully preserved.
        </p>
      </header>
      <div className={styles.toolbar}>
        <fieldset className={styles.filters} aria-label="Memory filters">
          <button type="button" aria-pressed="true">
            All
          </button>
          <button type="button" disabled title="Trips filter coming soon">
            Trips
          </button>
          <button type="button" disabled title="Anniversaries filter coming soon">
            Anniversaries
          </button>
          <button type="button" disabled title="Daily Life filter coming soon">
            Daily Life
          </button>
          <button type="button" disabled title="Favorites filter coming soon">
            <Heart aria-hidden="true" /> Favorites
          </button>
        </fieldset>
        <p className={styles.sort}>
          <span>Sort by:</span>
          <strong>Newest First</strong>
          <ChevronDown aria-hidden="true" />
        </p>
      </div>
      <MemoriesTimeline />
    </main>
  );
}
