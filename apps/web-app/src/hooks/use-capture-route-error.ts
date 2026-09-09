"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export function useCaptureRouteError(error: Error): void {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
}
