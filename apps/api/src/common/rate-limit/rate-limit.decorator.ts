import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_KEY = "rate-limit";

export type RateLimitOptions = Readonly<{
  limit: number;
  window: `${number} s` | `${number} m` | `${number} h`;
  strategy: "fixed-window" | "sliding-window";
  scope: "ip" | "user";
  key?: string;
  message?: string;
}>;

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
