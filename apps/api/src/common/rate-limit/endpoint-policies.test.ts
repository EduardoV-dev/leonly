import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppModule } from "../../app/app.module";
import { rateLimitStorage } from "./test-setup";

const { session, create, findMember, queryRaw } = vi.hoisted(() => ({
  session: vi.fn(),
  create: vi.fn(),
  findMember: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("../../auth/config/auth.config", () => ({
  createAuth: () => ({ api: { getSession: session } }),
}));
vi.mock("../prisma/prisma.service", () => ({
  PrismaService: class {
    spaceMember = { findFirst: findMember };
    space = { create };
    $queryRaw = queryRaw;
    async $transaction<T>(operation: (transaction: this) => Promise<T>): Promise<T> {
      return operation(this);
    }
  },
}));

const REVISION = "2026-09-05T16:00:00.123456Z";
const SPACE_REQUEST = { space_name: "Our Space", start_date: "2025-04-27", timezone: "UTC" };
const SETTINGS_REQUESTS = [
  { path: "/api/spaces/name", body: { name: "New Space", expectedUpdatedAt: REVISION } },
  {
    path: "/api/spaces/start-date",
    body: { startDate: "2025-04-28", timezone: "UTC", expectedUpdatedAt: REVISION },
  },
  {
    path: "/api/spaces/memberships/display-name",
    body: { displayName: "Leo Hart", expectedUpdatedAt: REVISION },
  },
];

describe("Nest endpoint rate-limit policies", () => {
  let app: INestApplication;
  const counters = new Map<string, number>();

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    counters.clear();
    session.mockResolvedValue({ user: { id: "first-user", name: "Leo" } });
    create.mockResolvedValue({ id: "space-id" });
    findMember.mockResolvedValue(null);
    queryRaw.mockResolvedValue([
      { spaceId: "space-id", memberId: "member-id", updatedAt: REVISION },
    ]);
    rateLimitStorage.limit.mockImplementation(async (identifier, options) => {
      if (!options.prefix.includes("endpoint:")) return undefined;
      const key = `${options.prefix}:${identifier}`;
      const count = (counters.get(key) ?? 0) + 1;
      counters.set(key, count);
      return {
        success: count <= options.limiter.limit,
        reset: Date.now() + 60_000,
        pending: Promise.resolve(),
      };
    });
  });

  const postSpace = (body: Record<string, unknown> = SPACE_REQUEST) =>
    request(app.getHttpServer())
      .post("/api/spaces")
      .set("Cookie", "better-auth.session_token=test")
      .send(body);
  const patchSetting = ({ path, body }: (typeof SETTINGS_REQUESTS)[number]) =>
    request(app.getHttpServer())
      .patch(path)
      .set("Cookie", "better-auth.session_token=test")
      .send(body);

  it("allows five creation requests, blocks the sixth before database work, and isolates users", async () => {
    for (let index = 0; index < 5; index += 1) await postSpace().expect(201);
    const blocked = await postSpace().expect(429);
    expect(blocked.body).toMatchObject({ ok: false, data: null });
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThanOrEqual(59);
    expect(create).toHaveBeenCalledTimes(5);
    expect(findMember).toHaveBeenCalledTimes(5);
    expect(rateLimitStorage.limit).toHaveBeenCalledWith(
      "user:first-user",
      expect.objectContaining({ limiter: { strategy: "fixed-window", limit: 5, window: "10 m" } }),
    );
    session.mockResolvedValue({ user: { id: "second-user", name: "Annie" } });
    await postSpace().expect(201);
    expect(create).toHaveBeenCalledTimes(6);
  });

  it("counts invalid creation requests before DTO validation", async () => {
    for (let index = 0; index < 5; index += 1) await postSpace({ space_name: 42 }).expect(400);
    await postSpace().expect(429);
    expect(findMember).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("shares thirty settings writes across fields and controllers without sharing between users", async () => {
    for (let index = 0; index < 30; index += 1) {
      await patchSetting(SETTINGS_REQUESTS[index % SETTINGS_REQUESTS.length]).expect(200);
    }
    for (const setting of SETTINGS_REQUESTS) {
      const blocked = await patchSetting(setting).expect(429);
      expect(blocked.body).toMatchObject({ ok: false, data: null });
      expect(Number(blocked.headers["retry-after"])).toBeGreaterThanOrEqual(59);
    }
    expect(queryRaw).toHaveBeenCalledTimes(60);
    const prefixes = rateLimitStorage.limit.mock.calls
      .map(([, options]) => options)
      .filter((options) => options.prefix.includes("endpoint:settings-writes"))
      .map((options) => {
        expect(options.limiter).toEqual({ strategy: "sliding-window", limit: 30, window: "1 m" });
        return options.prefix;
      });
    expect(new Set(prefixes).size).toBe(1);
    session.mockResolvedValue({ user: { id: "second-user", name: "Annie" } });
    await patchSetting(SETTINGS_REQUESTS[0]).expect(200);
    expect(queryRaw).toHaveBeenCalledTimes(62);
  });

  it("keeps space creation and settings-write quotas independent", async () => {
    for (let index = 0; index < 5; index += 1) await postSpace().expect(201);
    await postSpace().expect(429);
    await patchSetting(SETTINGS_REQUESTS[0]).expect(200);
    expect(queryRaw).toHaveBeenCalledTimes(2);
  });

  it("documents 429 and Retry-After for every new policy", () => {
    const document = SwaggerModule.createDocument(app, {
      openapi: "3.0.0",
      info: { title: "Rate limits", version: "1" },
    });
    const operations = [
      document.paths["/api/spaces"]?.post,
      ...SETTINGS_REQUESTS.map(({ path }) => document.paths[path]?.patch),
    ];
    for (const operation of operations) {
      expect(operation?.responses?.[429]).toMatchObject({
        headers: { "Retry-After": { schema: { type: "integer", minimum: 1 } } },
      });
      expect(operation?.description).toMatch(/requests per/);
    }
  });
});
