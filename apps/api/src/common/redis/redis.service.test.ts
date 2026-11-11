import { describe, expect, it, vi } from "vitest";
import { RedisService } from "./redis.service";

describe("RedisService", () => {
  it("requires a PONG response for a healthy Redis connection", async () => {
    const redis = { ping: vi.fn(async () => "PONG") };
    const service = new RedisService(redis as never);

    await expect(service.ping()).resolves.toBe(true);
    redis.ping.mockResolvedValue("unexpected");
    await expect(service.ping()).resolves.toBe(false);
  });
});
