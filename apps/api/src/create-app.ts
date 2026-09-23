import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter, type NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

export async function createApp(): Promise<NestExpressApplication> {
  return NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter());
}
