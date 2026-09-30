"use client";

import { APP_ROUTES } from "@/constants/routes";
import { useCaptureRouteError } from "@/hooks/use-capture-route-error";
import styles from "./server-error.module.css";

export type ServerErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}>;

export function ServerError({ error, reset, unstable_retry }: ServerErrorProps) {
  useCaptureRouteError(error);

  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="server-error-heading">
        <h1 id="server-error-heading">We couldn’t open this page</h1>
        <p>Leonly ran into a server error (500). Try opening this page again, or return home.</p>
        <div className={styles.actions}>
          <button className={styles.retry} type="button" onClick={unstable_retry ?? reset}>
            Try again
          </button>
          <a className={styles.home} href={APP_ROUTES.HOME}>
            Return home
          </a>
        </div>
      </section>
    </main>
  );
}
