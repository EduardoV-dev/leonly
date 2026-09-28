import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mountApiDocs } from "./api-docs";
import { type AuthenticatedRequest, AuthGuard } from "./auth/auth.guard";
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

describe("API application", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createApiApp();
    mountApiDocs(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves the prefixed OpenAPI document and Scalar reference", async () => {
    const document = await request(app.getHttpServer()).get("/openapi.json").expect(200);
    expect(document.body.paths).toHaveProperty("/api/health");
    expect(document.body.paths).toHaveProperty("/api/spaces");
    expect(document.body.components.schemas.CreateSpaceDto.required).toEqual(
      expect.arrayContaining(["space_name", "start_date", "timezone"]),
    );
    const reference = await request(app.getHttpServer()).get("/docs").expect(200);
    expect(reference.text).toContain("/openapi.json");
    await request(app.getHttpServer()).get("/api/docs").expect(404);
  });

  it("formats Nest route errors without changing their HTTP status", async () => {
    const response = await request(app.getHttpServer()).get("/missing").expect(404);
    expect(response.body).toEqual({
      ok: false,
      data: null,
      error: [{ code: "HTTP_404", message: "Not Found" }],
      message: "Not Found",
    });
  });

  it("requires a session for space creation without injected test metadata", async () => {
    await request(app.getHttpServer())
      .post("/api/spaces")
      .send({ space_name: "Example", start_date: "2026-07-22", timezone: "UTC" })
      .expect(401);
  });

  it("rejects invalid space input without emitted parameter metadata", async () => {
    vi.spyOn(app.get(AuthGuard), "canActivate").mockImplementation(async (context) => {
      context.switchToHttp().getRequest<AuthenticatedRequest>().authUser = { id: "test-user" };
      return true;
    });

    await request(app.getHttpServer())
      .post("/api/spaces")
      .send({ space_name: 42, start_date: "2026-02-30", timezone: "Invalid/Zone" })
      .expect(400);
  });
});
