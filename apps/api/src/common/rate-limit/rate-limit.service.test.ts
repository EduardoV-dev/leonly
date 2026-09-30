import { beforeEach, describe, expect, it, vi } from "vitest";

const rateLimitMethods = vi.hoisted(() => ({
  getRemaining: vi.fn(),
  limit: vi.fn(),
  resetUsedTokens: vi.fn(),
  fixedWindow: vi.fn(() => "fixed-window"),
  configure: vi.fn(),
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    constructor(options: unknown) {
      rateLimitMethods.configure(options);
    }
    static fixedWindow = rateLimitMethods.fixedWindow;

    getRemaining = rateLimitMethods.getRemaining;
    limit = rateLimitMethods.limit;
    resetUsedTokens = rateLimitMethods.resetUsedTokens;
  },
}));

import { RateLimitService } from "./rate-limit.service";

describe("RateLimitService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes application methods without returning the Upstash limiter", async () => {
    rateLimitMethods.getRemaining.mockResolvedValue({ remaining: 4, reset: 123 });
    rateLimitMethods.limit.mockResolvedValue({ success: true });
    rateLimitMethods.resetUsedTokens.mockResolvedValue(undefined);
    const service = new RateLimitService({} as never);
    const counter = service.create({ limit: 5, window: "10 m" });

    await expect(counter.getRemaining("user-1")).resolves.toEqual({ remaining: 4, reset: 123 });
    await counter.record("user-1");
    await counter.reset("user-1");

    expect(rateLimitMethods.fixedWindow).toHaveBeenCalledWith(5, "10 m");
    expect(rateLimitMethods.configure).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: "leonly-api" }),
    );
    expect(rateLimitMethods.getRemaining).toHaveBeenCalledWith("user-1");
    expect(rateLimitMethods.limit).toHaveBeenCalledWith("user-1");
    expect(rateLimitMethods.resetUsedTokens).toHaveBeenCalledWith("user-1");
    expect(counter).not.toHaveProperty("limit");
  });
});
