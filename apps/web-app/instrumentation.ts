import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { createRequestLogger, logServerError } from "@/lib/server-logger";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  Sentry.captureRequestError(error, request, context);
  const requestLogger = createRequestLogger(request);

  logServerError(
    {
      event: "next_request_error",
      operation: context.routeType,
    },
    error,
    requestLogger,
  );
};
