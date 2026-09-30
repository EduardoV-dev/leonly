import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { serializeError } from "./serialize-error";

const isDevelopment = process.env.NODE_ENV === "development";

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: isDevelopment ? "debug" : "info",
        genReqId: () => randomUUID(),
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
        serializers: {
          req: (request) => ({
            id: request.id,
            method: request.method,
            path: request.url?.split("?")[0],
          }),
          res: (response) => ({ statusCode: response.statusCode }),
          err: serializeError,
        },
        autoLogging: { ignore: (request) => request.url?.split("?")[0] === "/api/health" },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class ApiLoggerModule {}
