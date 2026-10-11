import type { LoggerOptions } from "pino";
import { serializeError } from "./serialize-error";

export { serializeError } from "./serialize-error";

export function createLoggerOptions(nodeEnvironment: string): LoggerOptions {
  const isDevelopment = nodeEnvironment === "development";

  return {
    level: isDevelopment ? "debug" : "info",
    transport: isDevelopment
      ? { target: "pino-pretty", options: { colorize: process.stdout.isTTY } }
      : undefined,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['x-api-key']",
        "res.headers['set-cookie']",
        "headers.authorization",
        "headers.cookie",
        "headers['set-cookie']",
        "password",
        "token",
        "secret",
        "accessToken",
        "refreshToken",
        "*.password",
        "*.token",
        "*.secret",
        "*.accessToken",
        "*.refreshToken",
      ],
      censor: "[Redacted]",
    },
    serializers: { err: serializeError, msg: serializeError },
  };
}
