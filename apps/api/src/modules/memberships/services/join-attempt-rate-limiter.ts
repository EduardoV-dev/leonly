import { Injectable } from "@nestjs/common";
import { RateLimitService } from "../../../common/rate-limit/rate-limit.service";
import { RedisService } from "../../../common/redis/redis.service";
import { JOIN_FAILURE_LIMIT, JOIN_WINDOW } from "../constants/memberships.constants";

export type JoinAttemptState = { failures: number; lockedUntil: Date | null };

@Injectable()
export class JoinAttemptRateLimiter {
  private rateLimiter?: ReturnType<RateLimitService["create"]>;

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly redisService: RedisService,
  ) {}

  async withUserLock<T>(userId: string, operation: () => Promise<T>): Promise<T> {
    return this.redisService.withLock(`join-space-attempt:${userId}:mutex`, operation);
  }

  async getState(userId: string): Promise<JoinAttemptState> {
    const { remaining, reset } = await this.limiter.getRemaining(userId);

    return {
      failures: JOIN_FAILURE_LIMIT - remaining,
      lockedUntil: remaining === 0 ? new Date(reset) : null,
    };
  }

  async recordFailure(userId: string): Promise<void> {
    await this.limiter.record(userId);
  }

  async clear(userId: string): Promise<void> {
    await this.limiter.reset(userId);
  }

  private get limiter(): ReturnType<RateLimitService["create"]> {
    this.rateLimiter ??= this.rateLimitService.create({
      limit: JOIN_FAILURE_LIMIT,
      window: JOIN_WINDOW,
    });
    return this.rateLimiter;
  }
}
