import { MODULE_METADATA } from "@nestjs/common/constants";
import { Redis } from "@upstash/redis";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RedisModule } from "./redis.module";
import { REDIS_CLIENT } from "./redis.tokens";

const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, RedisModule) as Array<{
  provide?: symbol;
  useFactory?: () => Redis;
}>;
const factory = providers.find((provider) => provider.provide === REDIS_CLIENT)?.useFactory;
if (!factory) throw new Error("Redis provider factory is missing.");
const createRedis = factory;

afterEach(() => vi.unstubAllEnvs());

describe("RedisModule", () => {
  it.each([
    ["", ""],
    ["https://redis.example.com", ""],
    ["", "test-token"],
  ])("fails startup for incomplete Redis credentials", (url, token) => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", url);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", token);
    expect(createRedis).toThrow("Redis URL and token are required.");
  });

  it("provides a Redis client when configured", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    expect(createRedis()).toBeInstanceOf(Redis);
  });
});
