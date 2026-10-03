import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApiApp } from "../app/create-app";

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
    $queryRaw = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
    verification = {
      create: vi.fn(({ data }) => data),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    };

    async onModuleInit() {}
    async onModuleDestroy() {}
  },
}));

vi.mock("../common/redis/redis.service", () => ({
  RedisService: class {
    ping = vi.fn().mockResolvedValue(true);
  },
}));

describe("Google authentication routes", () => {
  it("keeps health available and starts Google sign-in in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    let app: NestExpressApplication | undefined;

    try {
      app = await createApiApp();
      await app.init();
      const server = app.getHttpServer();

      await request(server)
        .get("/api/health")
        .expect(200)
        .expect({
          ok: true,
          data: { database: true, redis: true },
          error: [],
          message: "Request completed successfully",
        });
      await request(server).get("/docs").expect(404);
      await request(server).get("/openapi.json").expect(404);
      const googleSignIn = await request(server)
        .post("/api/auth/sign-in/social")
        .send({ provider: "google" })
        .expect(200);
      expect(googleSignIn.body.url).toContain("accounts.google.com");
      expect(new URL(googleSignIn.body.url).searchParams.get("redirect_uri")).toBe(
        "http://localhost:3000/api/auth/callback/google",
      );
      expect(googleSignIn.headers["set-cookie"]).toBeDefined();
      await request(server)
        .post("/api/auth/sign-in/social")
        .send({ provider: "github" })
        .expect(404);
      await request(server)
        .post("/api/auth/sign-in/email")
        .send({ email: "test@example.com", password: "test-password" })
        .expect(400);
      await request(server).get("/api/auth/get-session").expect(200);
      await request(server).get("/api/auth/callback/google").expect(302);
      await request(server).get("/api/auth/unknown").expect(404);
    } finally {
      await app?.close();
      vi.unstubAllEnvs();
    }
  });
});
