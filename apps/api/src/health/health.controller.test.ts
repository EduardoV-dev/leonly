import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { LoggerModule } from "nestjs-pino";
import request from "supertest";
import { afterAll, beforeAll, describe, it, vi } from "vitest";
import { ApiExceptionFilter } from "../common/http/filters/api-exception.filter";
import { ApiResponseInterceptor } from "../common/http/interceptors/api-response.interceptor";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

const check = vi.fn<HealthService["check"]>();

@Module({
  imports: [LoggerModule.forRoot({ pinoHttp: { level: "silent" } })],
  controllers: [HealthController],
  providers: [ApiExceptionFilter, { provide: HealthService, useValue: { check } }],
})
class HealthTestModule {}

describe("GET /api/health", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(HealthTestModule, { logger: false });
    app.setGlobalPrefix("api");
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalFilters(app.get(ApiExceptionFilter));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    { database: "up", redis: "up", status: "ok", httpStatus: 200 },
    { database: "down", redis: "up", status: "degraded", httpStatus: 503 },
    { database: "up", redis: "down", status: "degraded", httpStatus: 503 },
    { database: "down", redis: "down", status: "down", httpStatus: 503 },
  ] as const)(
    "returns $status directly for database=$database and redis=$redis",
    async ({ database, redis, status, httpStatus }) => {
      const health = { status, checks: { database, redis } };
      check.mockResolvedValue(health);
      await request(app.getHttpServer())
        .get("/api/health")
        .expect(httpStatus)
        .expect("Cache-Control", "no-store")
        .expect(health);
    },
  );
});
