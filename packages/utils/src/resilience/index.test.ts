import { BrokenCircuitError } from "cockatiel";
import { describe, expect, it, vi } from "vitest";
import { createCircuitBreaker, retry, withTimeout } from "./index";

describe("retry", () => {
  it("uses maxAttempts as the total number of calls", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("invite code collision"));

    await expect(
      retry(operation, {
        maxAttempts: 5,
        shouldRetry: () => true,
      }),
    ).rejects.toThrow("invite code collision");
    expect(operation).toHaveBeenCalledTimes(5);
  });
});

describe("withTimeout", () => {
  it("rejects when the operation exceeds its timeout", async () => {
    await expect(
      withTimeout(
        (signal) =>
          new Promise<void>((_, reject) => {
            signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
          }),
        1,
      ),
    ).rejects.toThrow();
  });
});

describe("createCircuitBreaker", () => {
  it("opens after the configured consecutive failure threshold", async () => {
    const breaker = createCircuitBreaker({ failureThreshold: 1, halfOpenAfterMs: 60_000 });

    await expect(
      breaker.execute(() => Promise.reject(new Error("service failure"))),
    ).rejects.toThrow("service failure");
    await expect(breaker.execute(() => Promise.resolve("unreachable"))).rejects.toBeInstanceOf(
      BrokenCircuitError,
    );
  });
});
