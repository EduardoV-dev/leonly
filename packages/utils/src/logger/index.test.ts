import pino from "pino";
import { describe, expect, it } from "vitest";
import { createLoggerOptions } from "./index";

describe("shared logger configuration", () => {
  it("uses structured output in production and pretty debug output in development", () => {
    expect(createLoggerOptions("production")).toMatchObject({
      level: "info",
      transport: undefined,
    });
    expect(createLoggerOptions("development")).toMatchObject({
      level: "debug",
      transport: { target: "pino-pretty" },
    });
  });

  it("redacts credentials while preserving event and error diagnostics", () => {
    const lines: string[] = [];
    const logger = pino(createLoggerOptions("production"), {
      write: (line: string) => lines.push(line),
    });
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
      event: "worker_failed",
      msg: "Failed for [Redacted email]",
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
