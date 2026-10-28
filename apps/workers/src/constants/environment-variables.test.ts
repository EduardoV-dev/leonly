import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("worker ENVIRONMENT_VARIABLES", () => {
  it("does not require publisher queue configuration to initialize the Lambda", async () => {
    vi.stubEnv("SQS_QUEUES_URLS", "invalid publisher configuration");
    vi.stubEnv("STORAGE_ENDPOINT", "http://floci:4566");

    const { ENVIRONMENT_VARIABLES } = await import("./environment-variables");

    expect(ENVIRONMENT_VARIABLES.STORAGE_ENDPOINT).toBe("http://floci:4566");
  });
});
