import { NestFactory } from "@nestjs/core";
import { ExpressAdapter, type NestExpressApplication } from "@nestjs/platform-express";
import { Logger } from "nestjs-pino";
import { AuthService } from "../../auth/auth.service";
import { createAuthHandler } from "../../auth/handlers/handler";
import { getWebAppOrigin } from "../../common/configs/environment-variables.config";
import { RateLimitGuard } from "../../common/rate-limit/guards/rate-limit.guard";
import { AppModule } from "../app.module";

const REQUEST_BODY_LIMIT = "1mb";

export async function createApiApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    bufferLogs: true,
  });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: [getWebAppOrigin()],
    credentials: true,
    exposedHeaders: ["Retry-After"],
  });
  app.enableCsrfProtection({ trustedOrigins: [getWebAppOrigin()] });

  // Parse before the async auth handler yields control to the Lambda adapter.
  app.useBodyParser("json", { limit: REQUEST_BODY_LIMIT });
  app.useBodyParser("urlencoded", { limit: REQUEST_BODY_LIMIT, extended: true });

  const express = app.getHttpAdapter().getInstance();
  express.all(
    "/api/auth/*splat",
    createAuthHandler({
      authService: app.get(AuthService),
      rateLimitGuard: app.get(RateLimitGuard),
      logger,
    }),
  );

  return app;
}
