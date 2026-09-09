"use client";

import { useCaptureRouteError } from "@/hooks/use-capture-route-error";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Readonly<GlobalErrorProps>) {
  useCaptureRouteError(error);

  return (
    <html lang="en">
      <body>
        <main>
          <h1>Something went wrong</h1>
          <p>Try again. If the problem persists, please return later.</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
