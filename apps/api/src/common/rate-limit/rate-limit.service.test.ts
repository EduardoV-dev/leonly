import { ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  limit: vi.fn(),
  configure: vi.fn(),
  fixedWindow: vi.fn(() => "fixed"),
  slidingWindow: vi.fn(() => "sliding"),
}));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    constructor(options: unknown) {
      sdk.configure(options);
    }
    static fixedWindow = sdk.fixedWindow;
    static slidingWindow = sdk.slidingWindow;
    limit = sdk.limit;
  },
}));

import { JOIN_RATE_LIMIT } from "../../modules/memberships/constants/memberships.constants";
import { RateLimitService } from "./rate-limit.service";

describe("RateLimitService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdk.limit.mockResolvedValue({ success: true, reset: 123, pending: Promise.resolve() });
  });

  it("uses sliding windows globally and fixed windows for shared join policies", async () => {
    const service = new RateLimitService({} as never);
    await service.check({ identifier: "user:one" });
    await service.check({ identifier: "user:one", endpoint: "join", policy: JOIN_RATE_LIMIT });
    await service.check({ identifier: "user:two", endpoint: "validate", policy: JOIN_RATE_LIMIT });
    expect(sdk.slidingWindow).toHaveBeenCalledWith(300, "1 m");
    expect(sdk.fixedWindow).toHaveBeenCalledWith(5, "10 m");
    expect(sdk.configure).toHaveBeenCalledTimes(2);
    const prefixes = sdk.configure.mock.calls.map(([options]) => options.prefix);
    expect(prefixes[0]).toContain("global");
    expect(prefixes[1]).toContain("endpoint:join-attempts");
    expect(sdk.limit).toHaveBeenLastCalledWith("user:two");
  });

  it("isolates endpoints and differing policy configurations", async () => {
    const service = new RateLimitService({} as never);
    const policy = { ...JOIN_RATE_LIMIT, key: undefined };
    await service.check({ identifier: "user:one", endpoint: "first", policy });
    await service.check({ identifier: "user:one", endpoint: "second", policy });
    await service.check({
      identifier: "user:one",
      endpoint: "first",
      policy: { ...policy, limit: 10 },
    });
    await service.check({
      identifier: "user:one",
      endpoint: "first",
      policy: { ...policy, strategy: "sliding-window" },
    });
    const prefixes = sdk.configure.mock.calls.map(([options]) => options.prefix);
    expect(new Set(prefixes).size).toBe(4);
  });

  it("returns denial metadata without resetting counters", async () => {
    sdk.limit.mockResolvedValue({ success: false, reset: 456, pending: Promise.resolve() });
    await expect(
      new RateLimitService({} as never).check({ identifier: "ip:one" }),
    ).resolves.toEqual({ success: false, reset: 456 });
  });

  it.each(["timeout", "storage failure"])("fails closed on %s", async (reason) => {
    if (reason === "timeout") sdk.limit.mockResolvedValue({ success: true, reason: "timeout" });
    else sdk.limit.mockRejectedValue(new Error("Redis unavailable"));
    await expect(new RateLimitService({} as never).check({ identifier: "ip:one" })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("rejects invalid policy configuration", async () => {
    await expect(
      new RateLimitService({} as never).check({
        identifier: "one",
        endpoint: "join",
        policy: { ...JOIN_RATE_LIMIT, limit: 0 },
      }),
    ).rejects.toThrow("Invalid rate limit policy.");
    expect(sdk.limit).not.toHaveBeenCalled();
  });
});
