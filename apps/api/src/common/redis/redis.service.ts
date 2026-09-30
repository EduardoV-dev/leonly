import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Inject, Injectable } from "@nestjs/common";
import { Redis } from "@upstash/redis";
import { REDIS_CLIENT } from "./redis.tokens";

const LOCK_TTL_MS = 60 * 1000;
const LOCK_WAIT_MS = 10 * 1000;
const LOCK_POLL_MS = 25;

const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async ping(): Promise<boolean> {
    return (await this.redis.ping()) === "PONG";
  }

  async withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const lockToken = randomUUID();
    const deadline = Date.now() + LOCK_WAIT_MS;

    while (true) {
      const isLockAcquired = await this.redis.set(key, lockToken, { nx: true, px: LOCK_TTL_MS });
      if (isLockAcquired) break;
      const hasTimedOut = Date.now() >= deadline;
      if (hasTimedOut) throw new Error("Could not acquire Redis lock.");
      await delay(LOCK_POLL_MS);
    }

    try {
      return await operation();
    } finally {
      await this.redis.createScript<number>(RELEASE_LOCK_SCRIPT).eval([key], [lockToken]);
    }
  }
}
