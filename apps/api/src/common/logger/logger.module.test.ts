import pino from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";

type LoggerOptions = {
  pinoHttp: {
    transport?: { target: string };
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

  it("prettifies only in development and emits JSON in production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await import("./logger.module");
    expect(forRoot.mock.calls[0][0].pinoHttp.transport?.target).toBe("pino-pretty");

    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    await import("./logger.module");
    expect(forRoot.mock.calls[1][0].pinoHttp.transport).toBeUndefined();
    expect(forRoot.mock.calls[1][0].pinoHttp.level).toBe("info");
  });

  it("serializes only safe request, response and error fields with a safe message", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await import("./logger.module");
    const options = forRoot.mock.calls[0][0].pinoHttp;
    expect(options.autoLogging.ignore({ url: "/api/health?probe=1" })).toBe(true);
    expect(options.autoLogging.ignore({ url: "/api/spaces" })).toBe(false);
    const lines: string[] = [];
    const logger = pino(
      { serializers: options.serializers, redact: options.redact },
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
        err: new Error("secret-database-detail"),
        account: { password: "secret-account-password" },
        accessToken: "secret-access-token",
      },
      "request completed",
    );

    expect(lines.join("")).toContain('"path":"/api/spaces"');
    for (const secret of [
      "secret-query",
      "secret-auth",
      "secret-cookie",
      "secret-body",
      "secret-response-cookie",
      "secret-database-detail",
      "secret-account-password",
      "secret-access-token",
    ]) {
      expect(lines.join("")).not.toContain(secret);
    }
  });
});
