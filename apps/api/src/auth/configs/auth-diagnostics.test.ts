import type { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_DIAGNOSTIC_EVENT, createAuthLogHandler } from "./auth-diagnostics";

type DiagnosticLogger = Record<"debug" | "log" | "warn" | "error", ReturnType<typeof vi.fn>>;

function createLoggerFixture(): { logger: DiagnosticLogger; loggerAsService: Logger } {
  const logger: DiagnosticLogger = {
    debug: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return { logger, loggerAsService: logger as unknown as Logger };
}

describe("Better Auth diagnostics", () => {
  let logger: DiagnosticLogger;
  let logHandler: ReturnType<typeof createAuthLogHandler>;

  beforeEach(() => {
    const fixture = createLoggerFixture();
    logger = fixture.logger;
    logHandler = createAuthLogHandler(fixture.loggerAsService);
  });

  it("classifies provider callback failures without leaking hostile callback URLs", () => {
    logHandler(
      "error",
      "Failed to validate callback https://app.example.com/auth/callback?code=oauth-secret-123&state=x#token",
    );

    expect(logger.error).toHaveBeenCalledWith({
      event: AUTH_DIAGNOSTIC_EVENT,
      level: "error",
      classification: "provider_callback_failed",
      detail: expect.stringContaining("[Redacted]"),
    });
    const record = JSON.stringify(logger.error.mock.calls[0][0]);
    expect(record).not.toContain("oauth-secret-123");
    expect(record).not.toContain("#token");
  });

  it("maps provider state failures to an approved classification", () => {
    logHandler("error", "State not found in OAuth callback");

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AUTH_DIAGNOSTIC_EVENT,
        classification: "oauth_state_invalid",
        level: "error",
      }),
    );
  });

  it("omits session objects and non-scalar arguments entirely", () => {
    logHandler(
      "warn",
      "Session validation failed",
      { session: { token: "secret-session-token", user: { email: "user@example.com" } } },
      { callbackURL: "/hostile-path?code=leaked" },
    );

    const rendered = JSON.stringify(logger.warn.mock.calls);
    expect(rendered).not.toContain("secret-session-token");
    expect(rendered).not.toContain("user@example.com");
    expect(rendered).not.toContain("hostile-path");
    expect(rendered).not.toContain("leaked");
  });

  it("retains error evidence for the shared logger serializer", () => {
    const cause = new Error("database unavailable");
    const failure = new Error("Failed to get session", { cause });

    logHandler("error", "INTERNAL_SERVER_ERROR", failure);

    expect(logger.error).toHaveBeenCalledWith({
      event: AUTH_DIAGNOSTIC_EVENT,
      level: "error",
      classification: "provider_diagnostic",
      err: failure,
    });
  });

  it("keeps sanitized scalar arguments and maps success to info", () => {
    logHandler("success", "Provider sign-in started", "google", 3, true);

    expect(logger.log).toHaveBeenCalledTimes(4);
    expect(logger.log.mock.calls[0][0]).toMatchObject({
      event: AUTH_DIAGNOSTIC_EVENT,
      level: "info",
      classification: "provider_diagnostic",
    });
    expect(logger.log.mock.calls.slice(1).map(([record]) => record)).toMatchObject([
      { detail: "google" },
      { detail: 3 },
      { detail: true },
    ]);
  });
});
