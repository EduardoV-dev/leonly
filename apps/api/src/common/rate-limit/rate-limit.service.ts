import { Inject, Injectable } from "@nestjs/common";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { REDIS_CLIENT } from "../redis/redis.tokens";
import { RATE_LIMIT_PREFIX } from "./rate-limit.constants";

type RateLimitOptions = {
  limit: number;
  window: Parameters<typeof Ratelimit.fixedWindow>[1];
};

export type RateLimitCounter = {
  getRemaining(identifier: string): Promise<{ remaining: number; reset: number }>;
  record(identifier: string): Promise<void>;
  reset(identifier: string): Promise<void>;
};

@Injectable()
export class RateLimitService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  create({ limit, window }: RateLimitOptions): RateLimitCounter {
    const rateLimit = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.fixedWindow(limit, window),
      prefix: RATE_LIMIT_PREFIX,
    });

    return {
      getRemaining: (identifier) => rateLimit.getRemaining(identifier),
      record: async (identifier) => {
        await rateLimit.limit(identifier);
      },
      reset: (identifier) => rateLimit.resetUsedTokens(identifier),
    };
  }
}
