import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiApp } from "../create-app/create-app";

const fixtures = vi.hoisted(() => ({
  authenticated: true,
  member: { findFirst: vi.fn() },
  memory: { findMany: vi.fn() },
  query: vi.fn(),
}));

vi.mock("../../common/configs/environment-variables.config", () => ({
  ENVIRONMENT_VARIABLES: {
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
    STORAGE_ENDPOINT: "http://localhost:4566",
    STORAGE_REGION: "us-east-1",
    STORAGE_BUCKET: "private-photos",
    STORAGE_ACCESS_KEY_ID: "local-access",
    STORAGE_SECRET_ACCESS_KEY: "local-secret",
    SQS_QUEUES_URLS: { memories: "http://localhost:4566/000000000000/images" },
    AWS_REGION: "us-east-1",
  },
  getWebAppOrigin: () => "http://localhost:3000",
}));
vi.mock("../../auth/auth.service", () => ({
  AuthService: class {
    auth = { handler: async () => new Response(null, { status: 401 }) };
    getRequestUser() {
      return fixtures.authenticated ? { id: "user-a" } : null;
    }
  },
}));
vi.mock("../../common/prisma/prisma.service", () => ({
  PrismaService: class {
    spaceMember = fixtures.member;
    memory = fixtures.memory;
    $queryRaw = fixtures.query;
  },
}));
vi.mock("../../common/rate-limit/guards/rate-limit.guard", () => ({
  RateLimitGuard: class {
    canActivate() {
      return true;
    }
  },
}));

describe("authenticated memory lists", () => {
  let app: Awaited<ReturnType<typeof createApiApp>>;
  let origin: string;

  beforeAll(async () => {
    app = await createApiApp();
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    fixtures.authenticated = true;
    fixtures.member.findFirst.mockReset().mockResolvedValue({
      id: "01900000-0000-7000-8000-000000000006",
      spaceId: "01900000-0000-7000-8000-000000000005",
    });
    fixtures.memory.findMany.mockReset().mockResolvedValue([]);
    fixtures.query.mockReset().mockResolvedValue([]);
  });

  it.each(["timeline", "vault"])("requires a session and membership for %s", async (route) => {
    fixtures.authenticated = false;
    expect((await fetch(`${origin}/api/memories/${route}`)).status).toBe(401);
    fixtures.authenticated = true;
    fixtures.member.findFirst.mockResolvedValue(null);
    expect((await fetch(`${origin}/api/memories/${route}`)).status).toBe(404);
    expect(fixtures.query).not.toHaveBeenCalled();
  });

  it.each([
    "timeline?limit=0",
    "timeline?limit=21",
    "timeline?limit=1.5",
    "timeline?sort=unknown",
    "timeline?cursor=!",
    "timeline?spaceId=other",
    "vault?limit=0",
    "vault?limit=21",
  ])("rejects invalid query %s", async (route) => {
    const response = await fetch(`${origin}/api/memories/${route}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, data: null });
    expect(fixtures.query).not.toHaveBeenCalled();
  });

  it.each([
    { memoryDate: "0000-01-01", createdAt: "2026-10-01T00:00:00Z" },
    { memoryDate: "2026-10-01", createdAt: "2026-10-01T00:00:00+23:59" },
  ])("rejects database-incompatible cursor dates", async (position) => {
    const cursor = Buffer.from(
      JSON.stringify({
        ...position,
        id: "01900000-0000-7000-8000-000000000004",
        sort: "newest",
      }),
    ).toString("base64url");

    const response = await fetch(`${origin}/api/memories/timeline?cursor=${cursor}`);
    expect(response.status).toBe(400);
    expect(fixtures.query).not.toHaveBeenCalled();
  });

  it.each([
    ["timeline?limit=1", 2],
    ["timeline?limit=20", 21],
    ["timeline?limit=4", 5],
    ["timeline", 11],
    ["vault?sort=oldest", 11],
    ["vault?limit=4", 5],
    ["vault?limit=20", 21],
  ])("uses bounded lookahead for %s", async (route, expectedLimit) => {
    const response = await fetch(`${origin}/api/memories/${route}`);
    expect(response.status).toBe(200);
    expect(fixtures.query.mock.calls[0][0].values).toContain(expectedLimit);
  });

  it("returns the standard page envelope and exact nullable item fields", async () => {
    fixtures.query.mockResolvedValue([
      {
        id: "01900000-0000-7000-8000-000000000004",
        title: "Memory",
        memoryDate: "2026-10-01",
        createdAt: "2026-10-01T00:00:00.123456Z",
        description: null,
        location: null,
      },
    ]);
    const response = await fetch(`${origin}/api/memories/timeline?limit=4&sort=oldest`);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      ok: true,
      data: {
        data: [
          {
            id: "01900000-0000-7000-8000-000000000004",
            title: "Memory",
            memoryDate: "2026-10-01",
            createdAt: "2026-10-01T00:00:00.123456Z",
            description: null,
            location: null,
            coverPhotoUrl: null,
          },
        ],
        meta: { nextCursor: null, cursorReset: false },
      },
      error: [],
    });
    expect(Object.keys(payload.data.data[0]).sort()).toEqual([
      "coverPhotoUrl",
      "createdAt",
      "description",
      "id",
      "location",
      "memoryDate",
      "title",
    ]);
  });

  it("returns a safe error if the database fails", async () => {
    fixtures.query.mockRejectedValue(new Error("secret database detail"));
    const response = await fetch(`${origin}/api/memories/vault`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret database detail");
  });

  it("documents the prefixed lists, parameters and signed-cover contract", () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const timeline = document.paths["/api/memories/timeline"]?.get;
    const vault = document.paths["/api/memories/vault"]?.get;
    expect(timeline?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "cursor" }),
        expect.objectContaining({ name: "sort" }),
        expect.objectContaining({ name: "limit" }),
      ]),
    );
    expect(vault?.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "limit" })]),
    );
    expect(JSON.stringify(timeline?.responses)).toContain("five minutes");
    for (const operation of [timeline, vault]) {
      expect(operation?.responses).toHaveProperty("429.headers.Retry-After");
      expect(operation?.responses).toHaveProperty("503");
    }
    expect(Object.keys(document.paths)).not.toContain("/api/memories/{memoryId}/cover");
  });
});
