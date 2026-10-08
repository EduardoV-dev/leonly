import type { RateLimitOptions } from "./rate-limit.decorator";

export const RATE_LIMIT_PREFIX = "leonly-api";
export const RATE_LIMIT_TIMEOUT_MS = 1000;
export const GLOBAL_RATE_LIMIT = {
  limit: 300,
  window: "1 m",
  strategy: "sliding-window",
  scope: "user",
} satisfies RateLimitOptions;

export const SETTINGS_WRITE_RATE_LIMIT = {
  limit: 30,
  window: "1 m",
  strategy: "sliding-window",
  scope: "user",
  key: "settings-writes",
} satisfies RateLimitOptions;
