import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { RedisService } from "../common/redis/redis.service";

export const HEALTH_CHECK_TIMEOUT_MS = 5_000;
export type DependencyHealth = Readonly<{ database: boolean; redis: boolean }>;

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<DependencyHealth> {
    const [database, redis] = await Promise.all([
      this.checkDependency(async () => {
        await this.prisma.$queryRaw`SELECT 1`;
        return true;
      }),
      this.checkDependency(() => this.redis.ping()),
    ]);
    return { database, redis };
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
