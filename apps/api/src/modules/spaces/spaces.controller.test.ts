import { formatInviteCodeDisplay, isValidInviteCode } from "@leonly/utils/invite-code";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppModule } from "../../app.module";
import { Prisma } from "../../generated/prisma/client";

const { session, findFirst, create, updateMany } = vi.hoisted(() => ({
  session: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("../../common/prisma/prisma.service", () => ({
  PrismaService: class {
    spaceMember = { findFirst, updateMany };
    space = { create };
  },
}));

vi.mock("../../auth/config/auth.config", () => ({
  createAuth: () => ({ api: { getSession: session } }),
}));

vi.mock("../../common/config/environment-variables.config", () => ({
  getWebAppOrigins: () => ["http://localhost:3000"],
}));

const validBody = {
  display_name: "Leo",
  space_name: "Forever Us",
  start_date: "2026-07-22",
  timezone: "America/Los_Angeles",
};

function collision(index: string | string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("private constraint", {
    code: "P2002",
    clientVersion: "7.10.0",
    meta: { target: index },
  });
}

describe("spaces API", () => {
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
    vi.clearAllMocks();
    session.mockResolvedValue({ user: { id: "better-auth-user", name: "Account Name" } });
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue({ id: "0199a9aa-1234-7000-8000-111111111111" });
    updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => vi.useRealTimers());

  const post = (body: Record<string, unknown> = validBody) =>
    request(app.getHttpServer())
      .post("/api/spaces")
      .set("Cookie", "better-auth.session_token=secret")
      .send(body);

  const postJoin = (path: string, body: Record<string, unknown>, authenticated = true) => {
    const call = request(app.getHttpServer()).post(path);
    if (authenticated) call.set("Cookie", "better-auth.session_token=secret");
    return call.send(body);
  };

  const postSetupCompletion = (authenticated = true) => {
    const call = request(app.getHttpServer()).post("/api/spaces/memberships/onboarding");
    if (authenticated) call.set("Cookie", "better-auth.session_token=secret");
    return call;
  };

  it("denies missing sessions without touching space data", async () => {
    session.mockResolvedValue(null);
    const response = await post();
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      ok: false,
      data: null,
      error: [{ code: "HTTP_401", message: "Authentication is required." }],
      message: "Authentication is required.",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("denies sessions without a user ID", async () => {
    session.mockResolvedValue({ user: {} });
    expect((await post()).status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it.each(["/api/spaces/memberships", "/api/spaces/invite-validations"])(
    "requires Better Auth for %s",
    async (path) => {
      session.mockResolvedValue(null);
      const response = await postJoin(
        path,
        { invite_code: "bad-code", user_id: "forged-user" },
        false,
      );
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ ok: false, data: null });
      expect(create).not.toHaveBeenCalled();
    },
  );

  it("rejects non-string invite codes before service lookup", async () => {
    const response = await postJoin("/api/spaces/invite-validations", { invite_code: 42 });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ ok: false, data: null, error: expect.any(Array) });
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts requests without an Origin header", async () => {
    expect((await post()).status).toBe(200);
  });

  it("completes setup for the authenticated membership", async () => {
    const response = await postSetupCompletion();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, data: { completed: true } });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "better-auth-user", deletedAt: null, space: { deletedAt: null } },
      data: { onboardingCompletedAt: expect.any(Date) },
    });
  });

  it("rejects setup completion without an active membership", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const response = await postSetupCompletion();

    expect(response.status).toBe(409);
    expect(updateMany).toHaveBeenCalledOnce();
  });

  it("requires Better Auth for setup completion", async () => {
    session.mockResolvedValue(null);

    expect((await postSetupCompletion(false)).status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...validBody, start_date: "2026-02-30" }, "start_date"],
    [{ ...validBody, start_date: "2999-01-01" }, "start_date"],
    [{ ...validBody, timezone: "Not/A_Zone" }, "timezone"],
    [{ ...validBody, display_name: "A" }, "display_name"],
    [{ ...validBody, space_name: " " }, "space_name"],
    [{ ...validBody, space_name: 42 }, "space_name"],
    [{ ...validBody, display_name: false }, "display_name"],
    [{ ...validBody, start_date: 20260722 }, "start_date"],
    [{ ...validBody, timezone: null }, "timezone"],
    [{ ...validBody, space_name: undefined }, "space_name"],
  ])("rejects invalid input with a field", async (body, field) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      data: null,
      error: expect.arrayContaining([
        { code: "VALIDATION_ERROR", field, message: expect.any(String) },
      ]),
    });
    expect(create).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("reports every invalid field in an error array", async () => {
    const response = await post({ ...validBody, space_name: "", start_date: "2026-02-30" });
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "space_name", code: "VALIDATION_ERROR" }),
        expect.objectContaining({ field: "start_date", code: "VALIDATION_ERROR" }),
      ]),
    );
    expect(response.body.error).toBeInstanceOf(Array);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects malformed and missing JSON without database calls", async () => {
    const malformed = await request(app.getHttpServer())
      .post("/api/spaces")
      .set("Cookie", "better-auth.session_token=secret")
      .set("Content-Type", "application/json")
      .send('{"space_name":');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toMatchObject({ ok: false, data: null, error: expect.any(Array) });

    const missing = await request(app.getHttpServer())
      .post("/api/spaces")
      .set("Cookie", "better-auth.session_token=secret");
    expect(missing.status).toBe(400);
    expect(missing.body).toMatchObject({
      ok: false,
      error: expect.arrayContaining([expect.objectContaining({ field: "space_name" })]),
    });
    expect(findFirst).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects non-object JSON without database calls", async () => {
    for (const body of [null, [], "unexpected"]) {
      const response = await request(app.getHttpServer())
        .post("/api/spaces")
        .set("Cookie", "better-auth.session_token=secret")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(body));
      expect(response.status).toBe(400);
      expect(findFirst).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    }
  });

  it("rejects existing active membership", async () => {
    findFirst.mockResolvedValue({ id: "existing" });
    const response = await post();
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      ok: false,
      data: null,
      error: [{ code: "HTTP_409", message: "You already belong to an active space." }],
      message: "You already belong to an active space.",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("compares dates in the submitted timezone across a UTC boundary", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-23T01:00:00Z"));
    const response = await post({ ...validBody, start_date: "2026-07-23" });
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "start_date" })]),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("atomically creates the space and owner using the session identity", async () => {
    const response = await post({ ...validBody, space_name: "  Forever Us  ", display_name: "" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      data: { space_id: "0199a9aa-1234-7000-8000-111111111111" },
      error: [],
      message: "Request completed successfully",
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "better-auth-user", deletedAt: null },
      select: { id: true },
    });
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: "Forever Us",
      createdByUserId: "better-auth-user",
      updatedByUserId: "better-auth-user",
      members: {
        create: { userId: "better-auth-user", displayName: "Account Name", role: "owner" },
      },
    });
    expect(data.members.create.onboardingCompletedAt).toBeNull();
    expect(data.inviteCode).toMatch(
      /^(leo|lov|mem|our|duo|two|joy|sun|lny)[abcdefghjkmnpqrstuvwxyz23456789]{5}$/,
    );
    expect(isValidInviteCode(data.inviteCode)).toBe(true);
    expect(isValidInviteCode(formatInviteCodeDisplay(data.inviteCode))).toBe(true);
    expect(data.inviteCodeExpiresAt.getTime() - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
  });

  it("trims names, accepts nullable display name, and strips unknown fields", async () => {
    const response = await post({
      ...validBody,
      space_name: "  Forever Us  ",
      display_name: "  Leo  ",
      role: "admin",
    });
    expect(response.status).toBe(200);
    expect(create.mock.calls[0][0].data).toMatchObject({
      name: "Forever Us",
      members: { create: { displayName: "Leo", role: "owner" } },
    });
    expect(await post({ ...validBody, display_name: null })).toHaveProperty("status", 200);
    expect(create.mock.calls[1][0].data.members.create.displayName).toBe("Account Name");
  });

  it.each(["", "A", "x".repeat(101)])(
    "uses the fallback for invalid account names",
    async (name) => {
      session.mockResolvedValue({ user: { id: "better-auth-user", name } });
      await post({ ...validBody, display_name: "" });
      expect(create.mock.calls.at(-1)?.[0].data.members.create.displayName).toBe("Leonly User");
    },
  );

  it("maps a concurrent active membership conflict to 409", async () => {
    create.mockRejectedValue(collision(["user_id"]));
    const response = await post();
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      ok: false,
      data: null,
      error: [{ code: "HTTP_409", message: "You already belong to an active space." }],
      message: "You already belong to an active space.",
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("retries only invite-code collisions", async () => {
    create.mockRejectedValueOnce(collision(["invite_code"]));
    const response = await post();
    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("returns generic 500 for other failures and after five invite attempts", async () => {
    create.mockRejectedValue(new Error("private database detail"));
    const response = await post();
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      ok: false,
      data: null,
      error: [
        {
          code: "INTERNAL_ERROR",
          message: "We could not complete your request. Please try again.",
        },
      ],
      message: "We could not complete your request. Please try again.",
    });
    expect(create).toHaveBeenCalledTimes(1);

    create.mockRejectedValue(collision("spaces_active_invite_code_unique"));
    expect((await post()).status).toBe(500);
    expect(create).toHaveBeenCalledTimes(6);
  });
});
