import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type AuthenticatedRequest, AuthGuard } from "../auth/auth.guard";
import { mountApiDocs } from "./api-docs";
import { createApiApp } from "./create-app";

vi.mock("../common/config/environment-variables.config", () => ({
  ENVIRONMENT_VARIABLES: {
    BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    DATABASE_URL: "postgresql://localhost/auth",
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "test-redis-token",
    WEB_APP_ORIGIN: "http://localhost:3000",
  },
  getWebAppOrigin: () => "http://localhost:3000",
}));
vi.mock("../common/prisma/prisma.service", () => ({
  PrismaService: class {
    spaceMember = { findFirst: vi.fn().mockResolvedValue(null) };
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
    expect(document.body.components.schemas.JoinSpaceDto.required).toContain("invite_code");
    expect(document.body.paths["/api/memberships"].post.tags).toEqual(["Memberships"]);
    expect(document.body.paths["/api/spaces/invites/validations"].post.tags).toEqual(["Spaces"]);
    expect(document.body.paths["/api/spaces/invites/regenerations"].post.tags).toEqual(["Spaces"]);
    const reference = await request(app.getHttpServer()).get("/docs").expect(200);
    expect(reference.text).toContain("/openapi.json");
    await request(app.getHttpServer()).get("/api/docs").expect(404);
  });

  it("documents response bodies and authentication for every Nest operation", async () => {
    const { body: document } = await request(app.getHttpServer()).get("/openapi.json").expect(200);
    const expectedOperations = [
      ["/api/health", "get", [200, 500, 503]],
      ["/api/spaces", "post", [200, 400, 401, 403, 409, 500]],
      ["/api/memberships/onboarding", "post", [200, 401, 403, 409, 500]],
      ["/api/spaces/invites/validations", "post", [200, 400, 401, 403, 404, 429, 500]],
      ["/api/memberships", "post", [200, 400, 401, 403, 404, 429, 500]],
      ["/api/users/me/space", "get", [200, 401, 500]],
    ] as const;

    for (const [path, method, statuses] of expectedOperations) {
      const operation = document.paths[path][method];
      expect(operation.description).toBeTruthy();
      if (path !== "/api/health") expect(operation.security).toEqual([{ session: [] }]);
      for (const status of statuses) {
        const schema = operation.responses[status].content["application/json"].schema;
        expect(schema.required).toEqual(["ok", "data", "error", "message"]);
        expect(schema.properties.ok.enum).toEqual([status === 200]);
        expect(schema.example).toEqual({
          ok: status === 200,
          data:
            status === 200 || (path === "/api/health" && status === 503)
              ? expect.any(Object)
              : null,
          error: status === 200 ? [] : expect.any(Array),
          message: expect.any(String),
        });
      }
    }
    expect(
      document.paths["/api/users/me/space"].get.responses[200].content["application/json"].schema
        .properties.data.nullable,
    ).toBe(true);
    expect(
      document.paths["/api/memberships"].post.responses[429].headers["Retry-After"].schema,
    ).toMatchObject({ type: "integer", minimum: 1 });
    expect(document.components.securitySchemes.session).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "better-auth.session_token",
    });
  });

  it("returns 404 for unmatched routes", async () => {
    await request(app.getHttpServer()).get("/missing").expect(404);
  });

  it("allows credentialed browser preflights from the configured frontend", async () => {
    const response = await request(app.getHttpServer())
      .options("/api/spaces")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type")
      .expect(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers["access-control-allow-headers"]).toContain("content-type");
  });

  it("does not grant CORS access to untrusted origins", async () => {
    const response = await request(app.getHttpServer())
      .options("/api/spaces")
      .set("Origin", "https://untrusted.example")
      .set("Access-Control-Request-Method", "POST");
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("exposes retry headers and CORS headers on API errors", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/spaces")
      .set("Origin", "http://localhost:3000")
      .send({ space_name: "Example", start_date: "2026-07-22", timezone: "UTC" })
      .expect(401);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers["access-control-expose-headers"]).toBe("Retry-After");
  });

  it("requires a session for space creation without injected test metadata", async () => {
    await request(app.getHttpServer())
      .post("/api/spaces")
      .send({ space_name: "Example", start_date: "2026-07-22", timezone: "UTC" })
      .expect(401);
  });

  it("preserves a successful JSON body when a route returns null", async () => {
    const authentication = vi
      .spyOn(app.get(AuthGuard), "canActivate")
      .mockImplementation(async (context) => {
        context.switchToHttp().getRequest<AuthenticatedRequest>().authUser = { id: "test-user" };
        return true;
      });

    try {
      await request(app.getHttpServer()).get("/api/users/me/space").expect(200).expect({
        ok: true,
        data: null,
        error: [],
        message: "Request completed successfully",
      });
    } finally {
      authentication.mockRestore();
    }
  });

  it("rejects cross-site state-changing requests", async () => {
    await request(app.getHttpServer())
      .post("/api/spaces")
      .set("Sec-Fetch-Site", "cross-site")
      .send({ space_name: "Example", start_date: "2026-07-22", timezone: "UTC" })
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          ok: false,
          data: null,
          error: expect.any(Array),
          message: expect.any(String),
        });
      });
  });

  it("allows configured frontend origins through CSRF protection", async () => {
    await request(app.getHttpServer())
      .post("/api/spaces")
      .set("Origin", "http://localhost:3000")
      .set("Sec-Fetch-Site", "cross-site")
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
