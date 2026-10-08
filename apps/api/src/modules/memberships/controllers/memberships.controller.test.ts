import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppModule } from "../../../app/app.module";
import { rateLimitStorage } from "../../../common/rate-limit/test-setup";

const { session, member, space, queryRaw, transaction } = vi.hoisted(() => ({
  session: vi.fn(),
  member: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  space: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  queryRaw: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../../../common/prisma/prisma.service", () => ({
  PrismaService: class {
    spaceMember = member;
    space = space;
    $queryRaw = queryRaw;
    $transaction = transaction;
  },
}));

vi.mock("../../../auth/config/auth.config", () => ({
  createAuth: () => ({ api: { getSession: session } }),
}));

vi.mock("../../../common/config/environment-variables.config", () => ({
  ENVIRONMENT_VARIABLES: {
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "test-redis-token",
  },
  getWebAppOrigin: () => "http://localhost:3000",
}));

describe("memberships API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, new ExpressAdapter(), { logger: false });
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    session.mockResolvedValue({ user: { id: "better-auth-user", name: "Account Name" } });
    member.findFirst.mockResolvedValue(null);
    member.updateMany.mockResolvedValue({ count: 1 });
    const invite = {
      createdByUserId: "owner-user",
      id: "space-id",
      inviteCodeExpiresAt: new Date(Date.now() + 60_000),
      members: [{ id: "owner-membership" }],
    };
    space.findFirst.mockResolvedValue(invite);
    space.findUnique.mockResolvedValue(invite);
    queryRaw.mockResolvedValue([{ id: "space-id" }]);
    transaction.mockImplementation((operation) =>
      operation({ spaceMember: member, space, $queryRaw: queryRaw }),
    );
  });

  const post = (path: string, body: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post(path)
      .set("Cookie", "better-auth.session_token=secret")
      .send(body);

  it.each(["/api/memberships", "/api/spaces/invites/validations", "/api/memberships/onboarding"])(
    "requires Better Auth for %s",
    async (path) => {
      session.mockResolvedValue(null);
      const response = await post(path, { invite_code: "bad-code", user_id: "forged-user" });
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ ok: false, data: null });
      expect(member.create).not.toHaveBeenCalled();
      expect(member.updateMany).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it("rejects non-string invite codes before service lookup", async () => {
    const response = await post("/api/spaces/invites/validations", { invite_code: 42 });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ ok: false, data: null, error: expect.any(Array) });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("completes setup for the authenticated membership", async () => {
    const response = await post("/api/memberships/onboarding");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, data: { completed: true } });
    expect(member.updateMany).toHaveBeenCalledWith({
      where: { userId: "better-auth-user", deletedAt: null, space: { deletedAt: null } },
      data: { onboardingCompletedAt: expect.any(Date) },
    });
  });

  it("rejects setup completion without an active membership", async () => {
    member.updateMany.mockResolvedValue({ count: 0 });
    expect((await post("/api/memberships/onboarding")).status).toBe(409);
    expect(member.updateMany).toHaveBeenCalledOnce();
  });

  it("validates an invite without creating a membership", async () => {
    const response = await post("/api/spaces/invites/validations", { invite_code: "LNY-7KMP2" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, data: { valid: true } });
    expect(member.create).not.toHaveBeenCalled();
  });

  it("joins through the memberships route using the authenticated identity", async () => {
    const response = await post("/api/memberships", {
      invite_code: "LNY-7KMP2",
      user_id: "forged-user",
    });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ok: true, data: { space_id: "space-id" } });
    expect(member.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "better-auth-user", displayName: "Account Name" }),
    });
  });

  it.each(["/api/memberships", "/api/spaces/invites/validations"])(
    "preserves Retry-After for locked attempts at %s",
    async (path) => {
      rateLimitStorage.limit.mockImplementation(async (_identifier, options) =>
        options.prefix.includes("endpoint:join-attempts")
          ? { success: false, reset: Date.now() + 600_000, pending: Promise.resolve() }
          : undefined,
      );
      const response = await post(path, { invite_code: "LNY-7KMP2" });
      expect(response.status).toBe(429);
      expect(Number(response.headers["retry-after"])).toBeGreaterThanOrEqual(599);
      expect(response.body).toMatchObject({ ok: false, data: null });
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it("shares a fixed-window quota for successful validation and joining without clearing it", async () => {
    let requests = 0;
    rateLimitStorage.limit.mockImplementation(async (_identifier, options) => {
      if (!options.prefix.includes("endpoint:join-attempts")) return undefined;
      expect(options.limiter).toEqual({ strategy: "fixed-window", limit: 5, window: "10 m" });
      return { success: ++requests <= 5, reset: Date.now() + 600_000, pending: Promise.resolve() };
    });
    for (let index = 0; index < 4; index += 1) {
      await post("/api/spaces/invites/validations", { invite_code: "LNY-7KMP2" }).expect(200);
    }
    await post("/api/memberships", { invite_code: "LNY-7KMP2" }).expect(201);
    await post("/api/spaces/invites/validations", { invite_code: "LNY-7KMP2" }).expect(429);
    expect(transaction).toHaveBeenCalledTimes(5);
    expect(session).toHaveBeenCalledTimes(6);
  });

  it("counts DTO validation failures before database work", async () => {
    await post("/api/memberships", { invite_code: 42 }).expect(400);
    expect(rateLimitStorage.limit).toHaveBeenCalledWith(
      "user:better-auth-user",
      expect.objectContaining({ prefix: expect.stringContaining("endpoint:join-attempts") }),
    );
    expect(transaction).not.toHaveBeenCalled();
  });
});
