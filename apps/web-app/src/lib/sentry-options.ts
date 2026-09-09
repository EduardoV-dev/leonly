import { sanitizeSentryBreadcrumb, sanitizeSentryEvent } from "./sentry-privacy";

const isDevelopment = process.env.NODE_ENV === "development";

export const sentryOptions = {
  beforeBreadcrumb: sanitizeSentryBreadcrumb,
  beforeSend: sanitizeSentryEvent,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: isDevelopment ? 1 : 0.1,
};
