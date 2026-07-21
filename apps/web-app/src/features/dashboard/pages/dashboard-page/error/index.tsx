"use client";

import styles from "./error.module.css";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export function DashboardError({ reset }: DashboardErrorProps) {
  return (
    <main className={styles.state}>
      <div className={styles.card}>
        <h1>We could not open your space</h1>
        <p>Your memories are safe. Try loading the dashboard again.</p>
        <button className={styles.retryButton} type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
