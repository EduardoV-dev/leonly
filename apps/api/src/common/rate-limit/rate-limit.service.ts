import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { REDIS_CLIENT } from "../redis/redis.tokens";
import {
  GLOBAL_RATE_LIMIT,
  RATE_LIMIT_PREFIX,
  RATE_LIMIT_TIMEOUT_MS,
} from "./rate-limit.constants";
import type { RateLimitOptions } from "./rate-limit.decorator";

type CheckParams = Readonly<{
  identifier: string;
  endpoint?: string;
  policy?: RateLimitOptions;
}>;

@Injectable()
export class RateLimitService {
  private readonly limiters = new Map<string, Ratelimit>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async check({
    identifier,
    endpoint,
    policy = GLOBAL_RATE_LIMIT,
  }: CheckParams): Promise<{ success: boolean; reset: number }> {
    const namespace = endpoint ? `endpoint:${policy.key ?? endpoint}` : "global";
    const key: string = JSON.stringify([
      namespace,
      policy.strategy,
      policy.limit,
      policy.window,
      policy.scope,
    ]);
    let limiter = this.limiters.get(key);

    if (!limiter) {
      this.validatePolicy(policy);

      limiter = new Ratelimit({
        redis: this.redis,
        limiter:
          policy.strategy === "fixed-window"
            ? Ratelimit.fixedWindow(policy.limit, policy.window)
            : Ratelimit.slidingWindow(policy.limit, policy.window),
        prefix: `${RATE_LIMIT_PREFIX}:${key}`,
        timeout: RATE_LIMIT_TIMEOUT_MS,
        analytics: true,
        ephemeralCache: policy.strategy === "fixed-window" ? undefined : false,
      });

      this.limiters.set(key, limiter);
    }

    try {
      const result = await limiter.limit(identifier);
      if (result.reason === "timeout") throw new Error("Rate limit storage timed out.");
      await result.pending;
      return { success: result.success, reset: result.reset };
    } catch (cause) {
      throw new ServiceUnavailableException("Rate limiting is temporarily unavailable.", { cause });
    }
  }

  private validatePolicy(policy: RateLimitOptions): void {
    const isLimitValid = Number.isSafeInteger(policy.limit) && policy.limit > 0;
    const isWindowValid = /^[1-9]\d* (s|m|h)$/.test(policy.window);
    const isStrategyValid = ["fixed-window", "sliding-window"].includes(policy.strategy);
    const isScopeValid = ["ip", "user"].includes(policy.scope);

    if (!isLimitValid || !isWindowValid || !isStrategyValid || !isScopeValid) {
      throw new Error("Invalid rate limit policy.");
    }
  }
}
