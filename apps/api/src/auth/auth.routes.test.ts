import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApiApp } from "../app/create-app";
import { rateLimitStorage } from "../common/rate-limit/test-setup";

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
  it.each(["/api/auth/get-session", "/api/auth/callback/google"])(
    "applies the global limit to %s",
    async (path) => {
      const app = await createApiApp();
      try {
        await app.init();
        rateLimitStorage.limit.mockResolvedValue({
          success: false,
          reset: Date.now() + 20_000,
          pending: Promise.resolve(),
        });
        const response = await request(app.getHttpServer()).get(path).expect(429);
        expect(response.body).toMatchObject({ ok: false, data: null });
        expect(Number(response.headers["retry-after"])).toBeGreaterThanOrEqual(19);
        expect(rateLimitStorage.limit).toHaveBeenCalledOnce();
      } finally {
        await app.close();
      }
    },
  );

  it.each(["/api/auth/sign-in/social", "/api/auth/sign-in/social/"])(
    "adds an IP-scoped sign-in limit at %s",
    async (path) => {
      const app = await createApiApp();
      try {
        await app.init();
        rateLimitStorage.limit.mockImplementation(async (_identifier, options) =>
          options.prefix.includes("endpoint:auth-sign-in")
            ? { success: false, reset: Date.now() + 20_000, pending: Promise.resolve() }
            : undefined,
        );
        const response = await request(app.getHttpServer())
          .post(path)
          .send({ provider: "google" })
          .expect(429);
        expect(response.body).toMatchObject({ ok: false, data: null });
        expect(Number(response.headers["retry-after"])).toBeGreaterThanOrEqual(19);
        expect(rateLimitStorage.limit).toHaveBeenCalledTimes(2);
        expect(rateLimitStorage.limit).toHaveBeenLastCalledWith(
          expect.stringMatching(/^ip:/),
          expect.objectContaining({
            limiter: { strategy: "sliding-window", limit: 5, window: "1 m" },
          }),
        );
      } finally {
        await app.close();
      }
    },
  );
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
