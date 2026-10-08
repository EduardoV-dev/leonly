import { beforeEach, vi } from "vitest";

const rateLimitStorage = vi.hoisted(() => ({
  limit: vi.fn(),
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    constructor(private readonly options: { prefix: string; limiter: unknown }) {}
    static fixedWindow = (limit: number, window: string) => ({
      strategy: "fixed-window",
      limit,
      window,
    });
    static slidingWindow = (limit: number, window: string) => ({
      strategy: "sliding-window",
      limit,
      window,
    });
    async limit(identifier: string) {
      return (
        (await rateLimitStorage.limit(identifier, this.options)) ?? {
          success: true,
          reset: Date.now() + 60_000,
          pending: Promise.resolve(),
        }
      );
    }
  },
}));

beforeEach(() => {
  rateLimitStorage.limit.mockReset();
});

export { rateLimitStorage };
