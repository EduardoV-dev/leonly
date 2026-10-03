import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, beforeAll, describe, it, vi } from "vitest";
import { ApiResponseInterceptor } from "../common/http/api-response.interceptor";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

const check = vi.fn();

@Module({
  controllers: [HealthController],
  providers: [{ provide: HealthService, useValue: { check } }],
})
class HealthTestModule {}

describe("GET /api/health", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(HealthTestModule, { logger: false });
    app.setGlobalPrefix("api");
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    { database: true, redis: true, status: 200 },
    { database: false, redis: true, status: 503 },
    { database: true, redis: false, status: 503 },
    { database: false, redis: false, status: 503 },
  ])("returns $status for database=$database and redis=$redis", async ({ status, ...health }) => {
    check.mockResolvedValue(health);
    await request(app.getHttpServer())
      .get("/api/health")
      .expect(status)
      .expect("Cache-Control", "no-store")
      .expect({
        ok: status === 200,
        data: health,
        error:
          status === 200
            ? []
            : [
                {
                  code: "HTTP_503",
                  message: "Service is temporarily unavailable. Please try again later.",
                },
              ],
        message:
          status === 200
            ? "Request completed successfully"
            : "Service is temporarily unavailable. Please try again later.",
      });
  });
});
