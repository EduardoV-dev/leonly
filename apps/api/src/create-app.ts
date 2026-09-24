import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter, type NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { createAuthHandler } from "./auth/handler";
import { PrismaService } from "./common/prisma/prisma.service";

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter());
  const express = app.getHttpAdapter().getInstance();
  express.all("/api/auth/*splat", createAuthHandler(app.get(PrismaService)));
  return app;
}
