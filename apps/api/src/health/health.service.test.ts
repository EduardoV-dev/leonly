import { Logger, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterEach, describe, expect, it, type Mock, type MockInstance, vi } from "vitest";
import { PrismaService } from "../common/prisma/prisma.service";
import { RedisService } from "../common/redis/redis.service";
import { HEALTH_CHECK_TIMEOUT_MS, HealthService } from "./health.service";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

@Module({})
class HealthFixtureModule {}

type CreateHealthServiceReturn = {
  health: HealthService;
  query: Mock<() => Promise<unknown>>;
  ping: Mock<RedisService["ping"]>;
  error: MockInstance;
};

async function createHealthService(): Promise<CreateHealthServiceReturn> {
  const query = vi.fn<() => Promise<unknown>>().mockResolvedValue([{ "?column?": 1 }]);
  const ping = vi.fn<RedisService["ping"]>().mockResolvedValue(true);
  const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
  const app = await NestFactory.createApplicationContext(
    {
      module: HealthFixtureModule,
      providers: [
        { provide: PrismaService, useValue: { $queryRaw: query } },
        { provide: RedisService, useValue: { ping } satisfies Pick<RedisService, "ping"> },
        HealthService,
      ],
    },
    { logger: false },
  );
  const health = app.get(HealthService);
  await app.close();

  return { health, query, ping, error };
}

function probeFailures(error: MockInstance): Record<string, unknown>[] {
  return error.mock.calls
    .map(([record]) => record as Record<string, unknown>)
    .filter((record) => record.event === "dependency_probe_failed");
}

describe("HealthService", () => {
  it("checks both dependencies and stays quiet on success", async () => {
    const { health, query, ping, error } = await createHealthService();
    await expect(health.check()).resolves.toEqual({
      status: "ok",
      checks: { database: "up", redis: "up" },
    });
    expect(query).toHaveBeenCalledOnce();
    expect(ping).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });

  it.each([
    { dependency: "database", status: "degraded", database: "down", redis: "up" },
    { dependency: "redis", status: "degraded", database: "up", redis: "down" },
    { dependency: "both", status: "down", database: "down", redis: "down" },
  ])(
    "reports $dependency failures independently as $status",
    async ({ dependency, status, database, redis }) => {
      const { health, query, ping, error } = await createHealthService();
      if (dependency !== "redis") query.mockRejectedValue(new Error("Database unavailable"));
      if (dependency !== "database") ping.mockRejectedValue(new Error("Redis unavailable"));
      await expect(health.check()).resolves.toEqual({
        status,
        checks: { database, redis },
      });

      const failures = probeFailures(error);
      const failingDependencies = dependency === "both" ? ["database", "redis"] : [dependency];
      expect(failures.map(({ dependency: name }) => name).sort()).toEqual(
        failingDependencies.sort(),
      );
      for (const failure of failures) {
        expect(failure).toMatchObject({
          event: "dependency_probe_failed",
          outcome: "rejected",
          timedOut: false,
        });
        expect(failure.durationMs).toBeGreaterThanOrEqual(0);
      }
    },
  );

  it("reports an unexpected Redis ping response as unhealthy", async () => {
    const { health, ping, error } = await createHealthService();
    ping.mockResolvedValue(false);
    await expect(health.check()).resolves.toEqual({
      status: "degraded",
      checks: { database: "up", redis: "down" },
    });

    const failures = probeFailures(error);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ dependency: "redis", outcome: "unhealthy" });
  });

  it("distinguishes probe timeouts from rejections", async () => {
    vi.useFakeTimers();
    const { health, query, error } = await createHealthService();
    query.mockReturnValue(new Promise(() => {}));
    const result = health.check();
    await vi.advanceTimersByTimeAsync(HEALTH_CHECK_TIMEOUT_MS);

    const failures = probeFailures(error);
    const databaseFailure = failures.find(({ dependency }) => dependency === "database");
    expect(databaseFailure).toMatchObject({ outcome: "timeout", timedOut: true });
    await expect(result).resolves.toMatchObject({
      status: "degraded",
      checks: { database: "down", redis: "up" },
    });
  });

  it("bounds concurrent probes and clears their timers", async () => {
    vi.useFakeTimers();
    const { health, query, ping, error } = await createHealthService();
    query.mockReturnValue(new Promise(() => {}));
    ping.mockReturnValue(new Promise(() => {}));
    const result = health.check();
    expect(query).toHaveBeenCalledOnce();
    expect(ping).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(HEALTH_CHECK_TIMEOUT_MS);
    await expect(result).resolves.toEqual({
      status: "down",
      checks: { database: "down", redis: "down" },
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(probeFailures(error)).toHaveLength(2);
  });
});
