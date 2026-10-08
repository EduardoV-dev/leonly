import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppModule } from "../../../app/app.module";

const { session, member, space, queryRaw, transaction, getState } = vi.hoisted(() => ({
  session: vi.fn(),
  member: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  space: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  queryRaw: vi.fn(),
  transaction: vi.fn(),
  getState: vi.fn(),
}));

vi.mock("../../../common/prisma/prisma.service", () => ({
  PrismaService: class {
    spaceMember = member;
    space = space;
    $queryRaw = queryRaw;
    $transaction = transaction;
  },
}));

vi.mock("../services/join-attempt-rate-limiter", () => ({
  JoinAttemptRateLimiter: class {
    getState = getState;
    withUserLock = async (_userId: string, operation: () => Promise<unknown>) => operation();
    recordFailure = vi.fn();
    clear = vi.fn();
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
    getState.mockResolvedValue({ failures: 0, lockedUntil: null });
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
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, data: { space_id: "space-id" } });
    expect(member.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "better-auth-user", displayName: "Account Name" }),
    });
  });

  it.each(["/api/memberships", "/api/spaces/invites/validations"])(
    "preserves Retry-After for locked attempts at %s",
    async (path) => {
      getState.mockResolvedValue({ failures: 5, lockedUntil: new Date(Date.now() + 600_000) });
      const response = await post(path, { invite_code: "LNY-7KMP2" });
      expect(response.status).toBe(429);
      expect(Number(response.headers["retry-after"])).toBeGreaterThanOrEqual(599);
      expect(response.body).toMatchObject({ ok: false, data: null });
      expect(transaction).not.toHaveBeenCalled();
    },
  );
});
