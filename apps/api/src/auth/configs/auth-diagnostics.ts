import { serializeError } from "@leonly/utils/logger";
import type { Logger } from "@nestjs/common";

export const AUTH_DIAGNOSTIC_EVENT = "auth_provider_diagnostic";

export type AuthDiagnosticLogger = Pick<Logger, "debug" | "log" | "warn" | "error">;

type AuthDiagnosticLevel = "debug" | "info" | "success" | "warn" | "error";

const CLASSIFICATIONS: ReadonlyArray<{ pattern: RegExp; classification: string }> = [
  {
    pattern: /\bstate\b.*(not found|invalid|parse|expired)/i,
    classification: "oauth_state_invalid",
  },
  { pattern: /callback/i, classification: "provider_callback_failed" },
  { pattern: /(already exists|account.*exists)/i, classification: "provider_account_rejected" },
  {
    pattern: /(invalid|rejected|unauthorized|denied|failed)/i,
    classification: "provider_request_rejected",
  },
];

export function createAuthLogHandler(logger: AuthDiagnosticLogger) {
  return (level: AuthDiagnosticLevel, message: string, ...args: unknown[]): void => {
    const emit = (record: Record<string, unknown>): void => logger[resolveLogMethod(level)](record);

    emit({
      event: AUTH_DIAGNOSTIC_EVENT,
      level: resolveRecordLevel(level),
      classification: classifyAuthMessage(message),
      detail: sanitizeAuthDiagnosticValue(message),
    });

    // Only sanitized scalars and errors are retained; session objects, callback
    // payloads, and provider structures are never forwarded to the logger.
    for (const arg of args) {
      if (arg instanceof Error) {
        emit({
          event: AUTH_DIAGNOSTIC_EVENT,
          level: resolveRecordLevel(level),
          classification: classifyAuthMessage(message),
          err: arg,
        });
        continue;
      }

      if (typeof arg !== "string" && typeof arg !== "number" && typeof arg !== "boolean") continue;
      const sanitized = sanitizeAuthDiagnosticValue(arg);
      if (sanitized === undefined) continue;
      emit({ event: AUTH_DIAGNOSTIC_EVENT, level: resolveRecordLevel(level), detail: sanitized });
    }
  };
}

function resolveLogMethod(level: AuthDiagnosticLevel): keyof AuthDiagnosticLogger {
  if (level === "info" || level === "success") return "log";
  return level;
}

function resolveRecordLevel(level: AuthDiagnosticLevel): "debug" | "info" | "warn" | "error" {
  if (level === "success") return "info";
  return level;
}

function classifyAuthMessage(message: string): string {
  for (const { pattern, classification } of CLASSIFICATIONS) {
    if (pattern.test(message)) return classification;
  }

  return "provider_diagnostic";
}

function sanitizeAuthDiagnosticValue(value: unknown): unknown {
  const sanitized = serializeError(value);
  return sanitized === null || sanitized === undefined ? undefined : sanitized;
}
