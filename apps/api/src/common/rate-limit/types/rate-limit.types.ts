export type RateLimitOptions = Readonly<{
  limit: number;
  window: `${number} s` | `${number} m` | `${number} h`;
  strategy: "fixed-window" | "sliding-window";
  scope: "ip" | "user";
  key?: string;
  message?: string;
}>;

export type CheckReturn = { success: boolean; reset: number };
