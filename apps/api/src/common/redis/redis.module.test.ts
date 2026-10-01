import { MODULE_METADATA } from "@nestjs/common/constants";
import { Redis } from "@upstash/redis";
import { afterEach, describe, expect, it, vi } from "vitest";

async function getRedisFactory(): Promise<() => Redis> {
  const [{ RedisModule }, { REDIS_CLIENT }] = await Promise.all([
    import("./redis.module"),
    import("./redis.tokens"),
  ]);
  const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, RedisModule) as Array<{
    provide?: symbol;
    useFactory?: () => Redis;
  }>;
  const factory = providers.find((provider) => provider.provide === REDIS_CLIENT)?.useFactory;
  if (!factory) throw new Error("Redis provider factory is missing.");
  return factory;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("RedisModule", () => {
  it.each([
    ["", ""],
    ["https://redis.example.com", ""],
    ["", "test-token"],
  ])("fails startup for incomplete Redis credentials", async (url, token) => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", url);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", token);
    const createRedis = await getRedisFactory();
    expect(createRedis).toThrow("Redis URL and token are required.");
  });

  it("provides a Redis client when configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const createRedis = await getRedisFactory();
    expect(createRedis()).toBeInstanceOf(Redis);
  });
});
