import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

function stripQueryString(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}${parsedUrl.pathname}`;
  } catch {
    return url.split("?", 1)[0] ?? url;
  }
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  if (!event.request) {
    return event;
  }

  return {
    ...event,
    request: {
      method: event.request.method,
      url: event.request.url ? stripQueryString(event.request.url) : undefined,
    },
  };
}

export function sanitizeSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  return {
    category: breadcrumb.category,
    level: breadcrumb.level,
    timestamp: breadcrumb.timestamp,
    type: breadcrumb.type,
  };
}
