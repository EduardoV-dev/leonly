import pino from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";

type LoggerOptions = {
  pinoHttp: {
    transport?: { target: string; options: { colorize: boolean } };
    level: string;
    autoLogging: { ignore: (request: { url?: string }) => boolean };
    serializers: Record<string, (value: unknown) => unknown>;
    redact: { paths: string[]; censor: string };
  };
};

const { forRoot } = vi.hoisted(() => ({
  forRoot: vi.fn((_options: LoggerOptions) => class MockLoggerModule {}),
}));
vi.mock("nestjs-pino", () => ({ LoggerModule: { forRoot } }));

describe("API logger configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    forRoot.mockClear();
  });

  it("uses pretty output only in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await import("./logger.module");
    expect(forRoot.mock.calls[0][0].pinoHttp.level).toBe("debug");
    expect(forRoot.mock.calls[0][0].pinoHttp.transport?.target).toBe("pino-pretty");

    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    await import("./logger.module");
    expect(forRoot.mock.calls[1][0].pinoHttp.level).toBe("info");
    expect(forRoot.mock.calls[1][0].pinoHttp.transport).toBeUndefined();
  });

  it("serializes safe request fields and preserves sanitized error diagnostics", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await import("./logger.module");
    const options = forRoot.mock.calls[0][0].pinoHttp;
    expect(options.autoLogging.ignore({ url: "/api/health?probe=1" })).toBe(true);
    expect(options.autoLogging.ignore({ url: "/api/spaces" })).toBe(false);
    const error = Object.assign(new Error("Database failed for user@example.com"), {
      cause: new Error("Authorization: Bearer secret-token"),
      code: "ECONNRESET",
      password: "secret-password",
    });
    const lines: string[] = [];
    const logger = pino(
      {
        serializers: options.serializers,
        redact: options.redact,
      },
      { write: (line: string) => lines.push(line) },
    );
    logger.info(
      {
        req: {
          id: "request-id",
          method: "POST",
          url: "/api/spaces?token=secret-query",
          headers: { authorization: "Bearer secret-auth", cookie: "secret-cookie" },
          body: { name: "secret-body" },
        },
        res: { statusCode: 500, headers: { "set-cookie": "secret-response-cookie" } },
        err: error,
        account: { password: "secret-account-password" },
        accessToken: "secret-access-token",
      },
      "request completed",
    );

    expect(lines.join("")).toContain('"path":"/api/spaces"');
    const logged = JSON.parse(lines.join("")) as {
      err: Record<string, unknown>;
      req: Record<string, unknown>;
      res: Record<string, unknown>;
    };
    expect(logged.req).toMatchObject({ id: "request-id", method: "POST", path: "/api/spaces" });
    expect(logged.res).toMatchObject({ statusCode: 500 });
    expect(logged.err).toMatchObject({
      message: "Database failed for [Redacted email]",
      code: "ECONNRESET",
      cause: { message: "Authorization: [Redacted]" },
    });
    expect(logged.err.stack).toEqual(expect.any(String));
    for (const secret of [
      "secret-query",
      "secret-auth",
      "secret-cookie",
      "secret-body",
      "secret-response-cookie",
      "secret-account-password",
      "secret-access-token",
      "secret-password",
      "secret-token",
      "user@example.com",
    ]) {
      expect(lines.join("")).not.toContain(secret);
    }
  });
});
