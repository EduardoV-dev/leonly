import pino from "pino";
import { describe, expect, it } from "vitest";
import { createLoggerOptions } from "./index";

const IDENTITY = { nodeEnvironment: "production", service: "api", environment: "staging" };

function createCapturingLogger(options = IDENTITY) {
  const lines: string[] = [];
  const logger = pino(createLoggerOptions(options), {
    write: (line: string) => lines.push(line),
  });
  return { logger, lines };
}

describe("shared logger configuration", () => {
  it("uses structured output in production and pretty debug output in development", () => {
    expect(createLoggerOptions(IDENTITY)).toMatchObject({
      level: "info",
      transport: undefined,
    });
    expect(createLoggerOptions({ ...IDENTITY, nodeEnvironment: "development" })).toMatchObject({
      level: "debug",
      transport: { target: "pino-pretty" },
    });
  });

  it("stamps every record with the service and environment identity", () => {
    const { logger, lines } = createCapturingLogger();
    logger.error({
      event: "worker_failed",
      token: "private-token",
      account: { password: "private-password" },
      err: Object.assign(new Error("Failed for user@example.com"), {
        code: "ECONNRESET",
        cause: new Error("Authorization: Bearer private-credential"),
      }),
    });

    expect(JSON.parse(lines[0])).toMatchObject({
      service: "api",
      environment: "staging",
      event: "worker_failed",
      token: "[Redacted]",
      account: { password: "[Redacted]" },
      err: {
        code: "ECONNRESET",
        message: "Failed for [Redacted email]",
        cause: { message: "Authorization: [Redacted]" },
      },
    });
    expect(lines[0]).not.toMatch(/private-|user@example\.com/);
  });
});
