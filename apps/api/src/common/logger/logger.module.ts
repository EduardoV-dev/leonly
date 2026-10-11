import { randomUUID } from "node:crypto";
import { createLoggerOptions } from "@leonly/utils/logger";
import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { ENVIRONMENT_VARIABLES } from "../config/environment-variables.config";

const loggerOptions = createLoggerOptions(ENVIRONMENT_VARIABLES.NODE_ENV);

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        ...loggerOptions,
        genReqId: () => randomUUID(),
        serializers: {
          ...loggerOptions.serializers,
          req: (request) => ({
            id: request.id,
            method: request.method,
            path: request.url?.split("?")[0],
          }),
          res: (response) => ({ statusCode: response.statusCode }),
        },
        autoLogging: { ignore: (request) => request.url?.split("?")[0] === "/api/health" },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class ApiLoggerModule {}
