import { describe, expect, it, vi } from "vitest";
import { RedisService } from "./redis.service";

function createService() {
  const evalScript = vi.fn(async () => 1);
  const redis = {
    ping: vi.fn(async () => "PONG"),
    set: vi.fn(async () => "OK"),
    createScript: vi.fn(() => ({ eval: evalScript })),
  };

  return { evalScript, redis, service: new RedisService(redis as never) };
}

describe("RedisService", () => {
  it("requires a PONG response for a healthy Redis connection", async () => {
    const { redis, service } = createService();
    await expect(service.ping()).resolves.toBe(true);
    redis.ping.mockResolvedValue("unexpected");
    await expect(service.ping()).resolves.toBe(false);
  });

  it("runs the operation under a lock and releases it", async () => {
    const { evalScript, redis, service } = createService();
    const operation = vi.fn(async () => "complete");

    await expect(service.withLock("user:1:lock", operation)).resolves.toBe("complete");

    expect(redis.set).toHaveBeenCalledWith("user:1:lock", expect.any(String), {
      nx: true,
      px: 60_000,
    });
    expect(operation).toHaveBeenCalledOnce();
    expect(evalScript).toHaveBeenCalledWith(["user:1:lock"], [expect.any(String)]);
  });

  it("releases the lock when the operation fails", async () => {
    const { evalScript, service } = createService();

    await expect(
      service.withLock("user:1:lock", async () => Promise.reject(new Error("failed"))),
    ).rejects.toThrow("failed");

    expect(evalScript).toHaveBeenCalledOnce();
  });
});
