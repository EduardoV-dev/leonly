import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppModule } from "../../app/app.module";
import { rateLimitStorage } from "../../common/rate-limit/test-setup";
import { Prisma } from "../../generated/prisma/client";

const { session, queryRaw, findUser, findMember, countMembers, updateSpace, withLock } = vi.hoisted(
  () => ({
    session: vi.fn(),
    queryRaw: vi.fn(),
    findUser: vi.fn(),
    findMember: vi.fn(),
    countMembers: vi.fn(),
    updateSpace: vi.fn(),
    withLock: vi.fn(),
  }),
);

vi.mock("../../common/prisma/prisma.service", () => ({
  PrismaService: class {
    $queryRaw = queryRaw;
    user = { findUnique: findUser };
    spaceMember = { findFirst: findMember, count: countMembers };
    space = { update: updateSpace };
    $transaction<T>(operation: (transaction: this) => Promise<T>): Promise<T> {
      return operation(this);
    }
  },
}));
vi.mock("../../auth/config/auth.config", () => ({
  createAuth: () => ({ api: { getSession: session } }),
}));
vi.mock("../../common/redis/redis.service", () => ({
  RedisService: class {
    withLock = withLock;
  },
}));
vi.mock("../../common/config/environment-variables.config", () => ({
  ENVIRONMENT_VARIABLES: {
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  },
  getWebAppOrigin: () => "http://localhost:3000",
}));

const REVISION = "2026-09-05T16:00:00.123456Z";
const NEXT_REVISION = "2026-09-05T16:00:00.123457Z";
const SPACE_ID = "0199a9aa-1234-7000-8000-111111111111";
const member = {
  id: "0199a9aa-1234-7000-8000-222222222222",
  displayName: "Leo",
  role: "owner",
  avatarUrl: null,
  isCurrentMember: true,
  joinedAt: REVISION,
  updatedAt: REVISION,
  spaceName: "Our Space",
  startDate: "2025-04-27",
  spaceUpdatedAt: REVISION,
  inviteCode: "twofw3k3",
  inviteExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
};
const lockedSettings = {
  spaceId: SPACE_ID,
  memberId: member.id,
  name: "Our Space",
  startDate: "2025-04-27",
  displayName: "Leo",
  spaceUpdatedAt: REVISION,
  memberUpdatedAt: REVISION,
};
const edits = [
  { path: "/api/spaces/name", field: "name", value: "New Space" },
  { path: "/api/spaces/start-date", field: "startDate", value: "2025-04-28", timezone: "UTC" },
  { path: "/api/spaces/memberships/display-name", field: "displayName", value: "Leo Hart" },
];

describe("settings API", () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    vi.resetAllMocks();
    session.mockResolvedValue({ user: { id: "current-user", name: "Leo" } });
    queryRaw.mockResolvedValue([member]);
    findUser.mockResolvedValue({ email: "leo@example.com", accounts: [{ providerId: "google" }] });
    findMember.mockResolvedValue({ id: member.id });
    countMembers.mockResolvedValue(1);
    updateSpace.mockResolvedValue({
      inviteCode: "lny7kmp2",
      inviteCodeExpiresAt: new Date("2099-01-02T00:00:00.000Z"),
    });
    withLock.mockImplementation(async (_key: string, operation: () => Promise<unknown>) =>
      operation(),
    );
  });

  const get = () =>
    request(app.getHttpServer())
      .get("/api/users/me/settings")
      .set("Cookie", "better-auth.session_token=test");
  const patch = (path: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .patch(path)
      .set("Cookie", "better-auth.session_token=test")
      .send(body);
  const regenerate = () =>
    request(app.getHttpServer())
      .post("/api/spaces/invites/regenerations")
      .set("Cookie", "better-auth.session_token=test");

  it("returns account, members, and exact revisions without private identifiers", async () => {
    const response = await get().expect(200);
    expect(response.body).toMatchObject({
      ok: true,
      data: {
        account: { email: "leo@example.com", providerLabel: "Google" },
        activeMembers: [
          { id: member.id, displayName: "Leo", isCurrentMember: true, updatedAt: REVISION },
        ],
        space: { name: "Our Space", startDate: "2025-04-27", updatedAt: REVISION },
        invite: { code: "twofw3k3", expiresAt: "2099-01-01T00:00:00.000Z", isAvailable: true },
        membershipState: "one-member",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("current-user");
    expect(response.body.data.activeMembers[0]).not.toHaveProperty("spaceName");
  });

  it("hides invites after a partner joins", async () => {
    queryRaw.mockResolvedValue([
      member,
      {
        ...member,
        id: "partner-membership",
        role: "partner",
        displayName: "Annie",
        isCurrentMember: false,
      },
    ]);
    const { body } = await get().expect(200);
    expect(body.data.membershipState).toBe("two-member");
    expect(body.data.invite).toEqual({ code: null, expiresAt: null, isAvailable: false });
    expect(body.data.activeMembers).toHaveLength(2);
  });

  it("preserves an expired invite for display while marking it unavailable", async () => {
    queryRaw.mockResolvedValue([{ ...member, inviteExpiresAt: new Date("2020-01-01") }]);
    const { body } = await get().expect(200);
    expect(body.data.invite).toMatchObject({ code: "twofw3k3", isAvailable: false });
  });

  it("returns null without an active membership", async () => {
    queryRaw.mockResolvedValue([]);
    expect((await get().expect(200)).body.data).toBeNull();
  });

  it("rejects an inconsistent current-member model safely", async () => {
    queryRaw.mockResolvedValue([{ ...member, isCurrentMember: false }]);
    const { body } = await get().expect(500);
    expect(body.data).toBeNull();
    expect(body.message).not.toContain("account");
  });

  it("requires a Better Auth session for every endpoint", async () => {
    session.mockResolvedValue(null);
    await get().expect(401);
    for (const edit of edits) await patch(edit.path, {}).expect(401);
    await regenerate().expect(401);
    expect(queryRaw).not.toHaveBeenCalled();
    expect(updateSpace).not.toHaveBeenCalled();
  });

  it.each(edits)(
    "updates $field and returns a full-precision revision",
    async ({ path, field, value, ...extra }) => {
      queryRaw
        .mockResolvedValueOnce([lockedSettings])
        .mockResolvedValueOnce([{ updatedAt: NEXT_REVISION }]);
      const { body } = await patch(path, {
        [field]: value,
        expectedUpdatedAt: REVISION,
        ...extra,
      }).expect(200);
      expect(body).toMatchObject({
        ok: true,
        data: { [field]: value, updatedAt: NEXT_REVISION, status: "updated" },
      });
      expect(queryRaw.mock.calls[0]?.slice(1)).toContain("current-user");
      expect(queryRaw.mock.calls[1]?.slice(1)).toContain(REVISION);
      expect(queryRaw.mock.calls[1]?.[0].join(" ")).toContain("::timestamptz");
    },
  );

  it.each(edits)(
    "returns null data on a stale $field edit",
    async ({ path, field, value, ...extra }) => {
      queryRaw.mockResolvedValueOnce([lockedSettings]).mockResolvedValueOnce([]);
      const { body } = await patch(path, {
        [field]: value,
        expectedUpdatedAt: NEXT_REVISION,
        ...extra,
      }).expect(409);
      expect(body).toMatchObject({
        ok: false,
        data: null,
      });
    },
  );

  it.each(edits)(
    "returns 404 for $field without a live membership",
    async ({ path, field, value, ...extra }) => {
      queryRaw.mockResolvedValueOnce([]);
      await patch(path, { [field]: value, expectedUpdatedAt: REVISION, ...extra }).expect(404);
      expect(queryRaw).toHaveBeenCalledOnce();
    },
  );

  it.each(["name", "displayName"])(
    "trims and validates Unicode %s without changing another member",
    async (field) => {
      const path = field === "name" ? "/api/spaces/name" : "/api/spaces/memberships/display-name";
      for (const value of ["x", " ", "😀".repeat(101), 42]) {
        await patch(path, { [field]: value, expectedUpdatedAt: REVISION }).expect(400);
      }
      expect(queryRaw).not.toHaveBeenCalled();
      queryRaw
        .mockResolvedValueOnce([lockedSettings])
        .mockResolvedValueOnce([{ updatedAt: NEXT_REVISION }]);
      const { body } = await patch(path, {
        [field]: ` ${"😀".repeat(100)} `,
        expectedUpdatedAt: REVISION,
      }).expect(200);
      expect(body.data[field]).toBe("😀".repeat(100));
      if (field === "displayName") expect(queryRaw.mock.calls[1]?.slice(1)).toContain(member.id);
    },
  );

  it.each([
    { startDate: "2025-02-30", timezone: "UTC" },
    { startDate: "2099-01-01", timezone: "UTC" },
    { startDate: "2025-04-27", timezone: "Invalid/Zone" },
    { startDate: "2025-04-27", timezone: 42 },
  ])("rejects invalid calendar dates and timezones", async (body) => {
    await patch("/api/spaces/start-date", { ...body, expectedUpdatedAt: REVISION }).expect(400);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("rejects malformed revisions and ignores forged scope fields", async () => {
    await patch("/api/spaces/name", { name: "Valid", expectedUpdatedAt: "not-a-date" }).expect(400);
    expect(queryRaw).not.toHaveBeenCalled();
    queryRaw
      .mockResolvedValueOnce([lockedSettings])
      .mockResolvedValueOnce([{ updatedAt: NEXT_REVISION }])
      .mockResolvedValueOnce([lockedSettings])
      .mockResolvedValueOnce([{ updatedAt: NEXT_REVISION }]);
    await patch("/api/spaces/name", {
      name: "Valid",
      expectedUpdatedAt: REVISION,
      userId: "other-user",
    }).expect(200);
    await patch("/api/spaces/memberships/display-name", {
      displayName: "Valid",
      expectedUpdatedAt: REVISION,
      membershipId: "other-member",
    }).expect(200);
    expect(queryRaw.mock.calls[0]?.slice(1)).toContain("current-user");
    expect(queryRaw.mock.calls[2]?.slice(1)).toContain("current-user");
    expect(queryRaw.mock.calls[3]?.slice(1)).toContain(member.id);
    expect(JSON.stringify(queryRaw.mock.calls)).not.toContain("other-user");
    expect(JSON.stringify(queryRaw.mock.calls)).not.toContain("other-member");
  });

  it("regenerates an expired invite with a 24-hour expiry and audit actor", async () => {
    queryRaw.mockResolvedValue([{ id: SPACE_ID, expiresAt: new Date("2020-01-01") }]);
    const before = Date.now();
    const { body } = await regenerate().expect(201);
    expect(body.data.invite_code).toBe("lny7kmp2");
    const details = updateSpace.mock.calls[0]?.[0];
    expect(details.data.updatedByUserId).toBe("current-user");
    expect(details.data.inviteCode).toMatch(
      /^(leo|lov|mem|our|duo|two|joy|sun|lny)[abcdefghjkmnpqrstuvwxyz23456789]{5}$/,
    );
    expect(details.data.inviteCodeExpiresAt.getTime()).toBeGreaterThanOrEqual(before + 86_400_000);
    expect(rateLimitStorage.limit).toHaveBeenCalledWith(
      "user:current-user",
      expect.objectContaining({ prefix: expect.stringContaining("endpoint:invite-regeneration") }),
    );
  });

  it("does not replace a still-valid invite", async () => {
    queryRaw.mockResolvedValue([{ id: SPACE_ID, expiresAt: new Date("2099-01-01") }]);
    await regenerate().expect(404);
    expect(updateSpace).not.toHaveBeenCalled();
  });

  it("returns joined when joining wins the space lock", async () => {
    queryRaw.mockResolvedValue([{ id: SPACE_ID, expiresAt: null }]);
    countMembers.mockResolvedValue(2);
    const { body } = await regenerate().expect(409);
    expect(body.error[0].code).toBe("joined");
    expect(updateSpace).not.toHaveBeenCalled();
  });

  it("enforces the regeneration limit and returns Retry-After", async () => {
    rateLimitStorage.limit.mockImplementation(async (_identifier, options) =>
      options.prefix.includes("endpoint:invite-regeneration")
        ? { success: false, reset: Date.now() + 600_000, pending: Promise.resolve() }
        : undefined,
    );
    const response = await regenerate().expect(429);
    expect(Number(response.headers["retry-after"])).toBeGreaterThanOrEqual(599);
    expect(updateSpace).not.toHaveBeenCalled();
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("counts regeneration requests even without an active membership", async () => {
    findMember.mockResolvedValue(null);
    await regenerate().expect(404);
    expect(rateLimitStorage.limit).toHaveBeenCalledWith(
      "user:current-user",
      expect.objectContaining({ prefix: expect.stringContaining("endpoint:invite-regeneration") }),
    );
  });

  it("retries invite collisions in a fresh transaction", async () => {
    queryRaw.mockResolvedValue([{ id: SPACE_ID, expiresAt: null }]);
    updateSpace.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("collision", {
        code: "P2002",
        clientVersion: "7.10.0",
        meta: { target: "spaces_active_invite_code_unique" },
      }),
    );
    await regenerate().expect(201);
    expect(updateSpace).toHaveBeenCalledTimes(2);
    expect(rateLimitStorage.limit).toHaveBeenCalledTimes(2);
  });

  it("documents settings reads and mutations under their owning resource tags", () => {
    const document = SwaggerModule.createDocument(app, {
      openapi: "3.0.0",
      info: { title: "Settings", version: "1" },
    });
    expect(document.paths["/api/users/me/settings"]?.get?.tags).toEqual(["Settings"]);
    expect(document.paths["/api/spaces/invites/regenerations"]?.post?.tags).toEqual(["Spaces"]);
    for (const { path, field } of edits) {
      const operation = document.paths[path]?.patch;
      expect(operation?.tags).toEqual([field === "displayName" ? "Memberships" : "Spaces"]);
      expect(operation?.responses?.[409]).toMatchObject({
        content: {
          "application/json": {
            schema: { properties: { data: { nullable: true, enum: [null] } } },
          },
        },
      });
    }
  });
});
