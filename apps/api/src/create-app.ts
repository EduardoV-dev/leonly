import { NestFactory } from "@nestjs/core";
import { ExpressAdapter, type NestExpressApplication } from "@nestjs/platform-express";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { AuthService } from "./auth/auth.service";
import { createAuthHandler } from "./auth/handler";

export async function createApiApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix("api");

  const express = app.getHttpAdapter().getInstance();
  express.all("/api/auth/*splat", createAuthHandler(app.get(AuthService)));
  return app;
}
