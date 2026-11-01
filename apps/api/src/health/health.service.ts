import type { HealthResponse } from "@leonly/utils/contracts";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { RedisService } from "../common/redis/redis.service";

export const HEALTH_CHECK_TIMEOUT_MS = 5_000;

@Injectable()
export class HealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async check(): Promise<HealthResponse> {
    const [isDatabaseUp, isRedisUp] = await Promise.all([
      this.checkDependency(async () => {
        await this.prismaService.$queryRaw`SELECT 1`;
        return true;
      }),
      this.checkDependency(() => this.redisService.ping()),
    ]);

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

  private async checkDependency(probe: () => Promise<boolean>): Promise<boolean> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        probe(),
        new Promise<false>((resolve) => {
          timeout = setTimeout(() => resolve(false), HEALTH_CHECK_TIMEOUT_MS);
        }),
      ]);
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
