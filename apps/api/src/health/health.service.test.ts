import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../common/prisma/prisma.service";
import type { RedisService } from "../common/redis/redis.service";
import { HEALTH_CHECK_TIMEOUT_MS, HealthService } from "./health.service";

afterEach(() => vi.useRealTimers());

function createHealthService() {
  const query = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
  const ping = vi.fn().mockResolvedValue(true);
  const health = new HealthService(
    { $queryRaw: query } as unknown as PrismaService,
    { ping } as unknown as RedisService,
  );
  return { health, query, ping };
}

describe("HealthService", () => {
  it("checks both dependencies", async () => {
    const { health, query, ping } = createHealthService();
    await expect(health.check()).resolves.toEqual({ database: true, redis: true });
    expect(query).toHaveBeenCalledOnce();
    expect(ping).toHaveBeenCalledOnce();
  });

  it.each(["database", "redis", "both"])(
    "reports %s failures independently",
    async (dependency) => {
      const { health, query, ping } = createHealthService();
      if (dependency !== "redis") query.mockRejectedValue(new Error("Database unavailable"));
      if (dependency !== "database") ping.mockRejectedValue(new Error("Redis unavailable"));
      await expect(health.check()).resolves.toEqual({
        database: dependency === "redis",
        redis: dependency === "database",
      });
    },
  );

  it("reports an unexpected Redis ping response as unhealthy", async () => {
    const { health, ping } = createHealthService();
    ping.mockResolvedValue(false);
    await expect(health.check()).resolves.toEqual({ database: true, redis: false });
  });

  it("bounds concurrent probes and clears their timers", async () => {
    vi.useFakeTimers();
    const { health, query, ping } = createHealthService();
    query.mockReturnValue(new Promise(() => {}));
    ping.mockReturnValue(new Promise(() => {}));
    const result = health.check();
    expect(query).toHaveBeenCalledOnce();
    expect(ping).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(HEALTH_CHECK_TIMEOUT_MS);
    await expect(result).resolves.toEqual({ database: false, redis: false });
    expect(vi.getTimerCount()).toBe(0);
  });
});
