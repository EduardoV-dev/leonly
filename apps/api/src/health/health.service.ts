import type { HealthResponse } from "@leonly/utils/contracts";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { RedisService } from "../common/redis/redis.service";

export const HEALTH_CHECK_TIMEOUT_MS = 5_000;

type ProbeOutcome = "timeout" | "rejected" | "unhealthy";

type ProbeDiagnostic = {
  dependency: string;
  durationMs: number;
  timedOut: boolean;
  outcome: ProbeOutcome;
  err?: unknown;
};

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async check(): Promise<HealthResponse> {
    const [databaseFailure, redisFailure] = await Promise.all([
      this.probeDependency("database", async () => {
        await this.prismaService.$queryRaw`SELECT 1`;
        return true;
      }),
      this.probeDependency("redis", () => this.redisService.ping()),
    ]);

    const isDatabaseUp = databaseFailure === undefined;
    const isRedisUp = redisFailure === undefined;
    const isHealthy = isDatabaseUp && isRedisUp;
    const isUnavailable = !isDatabaseUp && !isRedisUp;

    let status: HealthResponse["status"] = "degraded";

    if (isHealthy) status = "ok";
    if (isUnavailable) status = "down";

    return {
      status,
      checks: { database: isDatabaseUp ? "up" : "down", redis: isRedisUp ? "up" : "down" },
    };
  }

  private async probeDependency(
    dependency: string,
    probe: () => Promise<boolean>,
  ): Promise<ProbeDiagnostic | undefined> {
    const startedAt = Date.now();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;

    try {
      const outcome = await Promise.race([
        probe().then((up) => (up ? undefined : ("unhealthy" as const))),
        new Promise<"timeout">((resolve) => {
          timeout = setTimeout(() => {
            timedOut = true;
            resolve("timeout");
          }, HEALTH_CHECK_TIMEOUT_MS);
        }),
      ]);

      if (outcome === undefined) return undefined;

      return this.recordFailure(dependency, { startedAt, timedOut, outcome });
    } catch (error) {
      return this.recordFailure(dependency, {
        startedAt,
        timedOut,
        outcome: "rejected",
        err: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private recordFailure(
    dependency: string,
    failure: { startedAt: number; timedOut: boolean; outcome: ProbeOutcome; err?: unknown },
  ): ProbeDiagnostic {
    const diagnostic: ProbeDiagnostic = {
      dependency,
      durationMs: Math.max(0, Date.now() - failure.startedAt),
      timedOut: failure.timedOut,
      outcome: failure.outcome,
      ...(failure.err !== undefined ? { err: failure.err } : {}),
    };
    this.logger.error({ event: "dependency_probe_failed", ...diagnostic });
    return diagnostic;
  }
}
