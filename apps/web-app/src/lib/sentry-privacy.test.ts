import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { sanitizeSentryBreadcrumb, sanitizeSentryEvent } from "./sentry-privacy";

describe("sanitizeSentryEvent", () => {
  it("removes request payloads and query strings", () => {
    const event = {
      request: {
        cookies: { session: "secret" },
        data: { title: "Private memory" },
        headers: { authorization: "Bearer secret" },
        method: "POST",
        url: "https://leonly.app/api/memories?invite=secret",
      },
      type: undefined,
    } satisfies ErrorEvent;

    expect(sanitizeSentryEvent(event)).toMatchObject({
      request: {
        method: "POST",
        url: "https://leonly.app/api/memories",
      },
    });
  });
});

describe("sanitizeSentryBreadcrumb", () => {
  it("removes contextual breadcrumb data", () => {
    const breadcrumb = {
      category: "fetch",
      data: { url: "https://leonly.app/api/memories?invite=secret" },
      level: "info",
      timestamp: 1,
      type: "http",
    } satisfies Breadcrumb;

    expect(sanitizeSentryBreadcrumb(breadcrumb)).toEqual({
      category: "fetch",
      level: "info",
      timestamp: 1,
      type: "http",
    });
  });
});
