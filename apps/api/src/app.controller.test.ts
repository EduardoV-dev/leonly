import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, beforeAll, describe, it, vi } from "vitest";
import { createApiApp } from "./create-app";

vi.mock("./common/config/environment-variables.config", () => ({
  ENVIRONMENT_VARIABLES: {
    APP_BASE_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    DATABASE_URL: "postgresql://localhost/auth",
    WEB_APP_ORIGINS: "http://localhost:3000",
  },
  getWebAppOrigins: () => ["http://localhost:3000"],
}));
vi.mock("./common/prisma/prisma.service", () => ({
  PrismaService: class {
    verification = {
      create: vi.fn(({ data }) => data),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    };

    async onModuleInit() {}
    async onModuleDestroy() {}
  },
}));

describe("GET /api/health", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createApiApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns an OK health status", async () => {
    await request(app.getHttpServer())
      .get("/api/health")
      .expect(200)
      .expect({
        ok: true,
        data: { status: "ok" },
        error: [],
        message: "Request completed successfully",
      });
  });
});
