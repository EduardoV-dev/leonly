import pino, { type Logger } from "pino";

const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g;
const URL_PATTERN = /\bhttps?:\/\/[^\s]+/gi;
const SENSITIVE_VALUE_PATTERN = /\b(authorization|cookie|code|state|token)\s*[:=]\s*[^\s,;]+/gi;
const TRUSTED_REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

type ErrorRecord = Record<string, unknown>;
type RequestHeaders = Headers | Record<string, string | string[] | undefined>;

export type NormalizedError = {
  code?: string;
  error_type: string;
  message: string;
  status?: number;
};

export type ErrorLogFields = Readonly<{
  event: string;
  operation: string;
  requestId?: string;
}>;

function isRecord(value: unknown): value is ErrorRecord {
  return typeof value === "object" && value !== null;
}

function sanitizeText(value: string): string {
  return value
    .replace(URL_PATTERN, "[REDACTED_URL]")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(SENSITIVE_VALUE_PATTERN, "$1=[REDACTED]");
}

function getSafeCode(error: ErrorRecord): string | undefined {
  const code = error.code;

  if (typeof code !== "string" || !/^(?:[0-9]{5}|[A-Z][A-Z0-9_]{1,63})$/.test(code)) {
    return undefined;
  }

  return code;
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    const errorRecord = error as Error & ErrorRecord;
    const normalizedError: NormalizedError = {
      error_type: sanitizeText(error.name),
      message: sanitizeText(error.message),
    };
    const code = getSafeCode(errorRecord);
    const status = errorRecord.status;

    if (code) {
      normalizedError.code = code;
    }
    if (typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599) {
      normalizedError.status = status;
    }

    return normalizedError;
  }

  if (isRecord(error)) {
    const errorType = typeof error.name === "string" ? error.name : "UnknownError";
    const message = typeof error.message === "string" ? error.message : "Unknown server error";
    const normalizedError: NormalizedError = {
      error_type: sanitizeText(errorType),
      message: sanitizeText(message),
    };
    const code = getSafeCode(error);
    const status = error.status;

    if (code) {
      normalizedError.code = code;
    }
    if (typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599) {
      normalizedError.status = status;
    }

    return normalizedError;
  }

  return { error_type: "UnknownError", message: "Unknown server error" };
}

const isDevelopment = process.env.NODE_ENV === "development";

export const logger: Logger = pino(
  {
    level: isDevelopment ? "debug" : "info",
  },
  isDevelopment
    ? pino.transport({
        target: "pino-pretty",
        options: { colorize: true },
      })
    : undefined,
);

function getHeader(headers: RequestHeaders, name: string): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  const value = headers[name];
  return typeof value === "string" ? value : undefined;
}

export function createRequestLogger(request: Readonly<{ headers: RequestHeaders }>): Logger {
  const platformRequestId = getHeader(request.headers, "x-vercel-id");
  const requestId =
    platformRequestId && TRUSTED_REQUEST_ID_PATTERN.test(platformRequestId)
      ? platformRequestId
      : crypto.randomUUID();

  return logger.child({ requestId });
}

export function logServerError(
  fields: ErrorLogFields,
  error: unknown,
  targetLogger: Logger = logger,
): void {
  targetLogger.error({ ...fields, error: normalizeError(error) }, "server_error");
}
