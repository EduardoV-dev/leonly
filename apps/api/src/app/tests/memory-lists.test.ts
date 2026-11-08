import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiApp } from "../create-app/create-app";

const fixtures = vi.hoisted(() => ({
  authenticated: true,
  member: { findFirst: vi.fn() },
  memory: { findFirst: vi.fn(), findMany: vi.fn() },
  reaction: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
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
    memoryReaction = fixtures.reaction;
    $queryRaw = fixtures.query;
    $transaction(callback: (client: unknown) => unknown) {
      return callback(this);
    }
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
    fixtures.memory.findFirst.mockReset().mockResolvedValue(null);
    fixtures.reaction.findMany.mockReset().mockResolvedValue([]);
    fixtures.reaction.findUnique.mockReset().mockResolvedValue(null);
    fixtures.reaction.create.mockReset().mockResolvedValue({});
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
    fixtures.reaction.findMany.mockResolvedValue([
      {
        memoryId: "01900000-0000-7000-8000-000000000004",
        reactionType: "heart",
        reactedByMemberId: "01900000-0000-7000-8000-000000000006",
        reactedByMember: { displayName: "Alex" },
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
            reaction: {
              counts: { heart: 1, laugh: 0, cry: 0, star: 0 },
              currentReaction: "heart",
              members: { heart: ["Alex"], laugh: [], cry: [], star: [] },
            },
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
      "reaction",
      "title",
    ]);
  });

  it("returns a safe error if the database fails", async () => {
    fixtures.query.mockRejectedValue(new Error("secret database detail"));
    const response = await fetch(`${origin}/api/memories/vault`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret database detail");
  });

  it.each(["timeline", "vault"])(
    "enforces the %s detail session and unavailable boundary",
    async (route) => {
      const path = `${origin}/api/memories/${route}/01900000-0000-7000-8000-000000000004`;
      fixtures.authenticated = false;
      expect((await fetch(path)).status).toBe(401);
      fixtures.authenticated = true;
      const absent = await fetch(path);
      expect(absent.status).toBe(404);
      const malformed = await fetch(`${origin}/api/memories/${route}/invalid`);
      expect(malformed.status).toBe(400);
      expect(await malformed.json()).toMatchObject({
        message: "Memory id is not valid.",
        error: [{ code: "HTTP_400", message: "Memory id is not valid." }],
      });
      fixtures.member.findFirst.mockResolvedValue(null);
      const noMember = await fetch(path);
      expect(noMember.status).toBe(404);
      expect(await noMember.json()).toMatchObject({ message: "An active space is required." });
      expect(fixtures.memory.findMany).not.toHaveBeenCalled();
    },
  );

  it.each(["timeline", "vault"])("returns an authorized %s detail envelope", async (route) => {
    const date = new Date("2026-10-01T12:00:00Z");
    fixtures.memory.findFirst.mockResolvedValue({
      id: "01900000-0000-7000-8000-000000000004",
      title: "Memory",
      memoryDate: date,
      createdAt: date,
      updatedAt: date,
      description: null,
      location: null,
      visibility: route,
      coverFileId: null,
      createdByMember: { displayName: "Sarah", user: { image: null } },
      memoryFiles: [],
    });
    const response = await fetch(
      `${origin}/api/memories/${route}/01900000-0000-7000-8000-000000000004`,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        title: "Memory",
        visibility: route,
        creatorDisplayName: "Sarah",
        photos: [],
        relatedMemories: [],
        reaction: {
          counts: { heart: 0, laugh: 0, cry: 0, star: 0 },
          currentReaction: null,
          members: { heart: [], laugh: [], cry: [], star: [] },
        },
      },
      error: [],
    });
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

  it("documents both private detail reads and signed URL limitations", () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    for (const visibility of ["timeline", "vault"]) {
      const operation = document.paths[`/api/memories/${visibility}/{memoryId}`]?.get;
      expect(operation?.responses).toHaveProperty("200");
      expect(operation?.responses).toHaveProperty("400");
      expect(operation?.responses).toHaveProperty("401");
      expect(operation?.responses).toHaveProperty("404");
      expect(JSON.stringify(operation?.responses)).toContain("300 seconds");
      expect(JSON.stringify(operation?.responses)).toContain("currentReaction");
    }
  });

  it("serves reaction reads and validated toggles with private envelopes", async () => {
    const path = `${origin}/api/memories/01900000-0000-7000-8000-000000000004/reactions`;
    fixtures.memory.findFirst.mockResolvedValue({ id: "memory" });
    const read = await fetch(path);
    expect(read.status).toBe(200);
    expect(read.headers.get("cache-control")).toBe("no-store");
    expect(await read.json()).toMatchObject({
      ok: true,
      data: { currentReaction: null, counts: { heart: 0, laugh: 0, cry: 0, star: 0 } },
      error: [],
    });
    for (const reactionType of ["heart", "laugh", "cry", "star"]) {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reactionType }),
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("rejects malformed, extra and unavailable reaction requests", async () => {
    const path = `${origin}/api/memories/01900000-0000-7000-8000-000000000004/reactions`;
    for (const body of [
      "{",
      "{}",
      '{"reactionType":"bad"}',
      '{"reactionType":"heart","spaceId":"other"}',
    ]) {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ ok: false, data: null });
    }
    expect((await fetch(`${origin}/api/memories/invalid/reactions`)).status).toBe(400);
    expect((await fetch(path)).status).toBe(404);
    fixtures.authenticated = false;
    expect((await fetch(path)).status).toBe(401);
    expect(fixtures.reaction.create).not.toHaveBeenCalled();
  });

  it("documents the reaction operations", () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const path = document.paths["/api/memories/{memoryId}/reactions"];
    for (const operation of [path?.get, path?.post]) {
      expect(operation?.responses).toHaveProperty("200");
      expect(operation?.responses).toHaveProperty("401");
      expect(operation?.responses).toHaveProperty("404");
      expect(operation?.responses).toHaveProperty("429");
      expect(operation?.responses).toHaveProperty("503");
      expect(JSON.stringify(operation?.responses)).toContain("currentReaction");
    }
    expect(path?.post?.responses).toHaveProperty("400");
    expect(JSON.stringify(path?.post?.requestBody)).toContain("ToggleMemoryReactionDto");
  });

  it("hides unexpected reaction storage failures", async () => {
    fixtures.memory.findFirst.mockResolvedValue({ id: "memory" });
    fixtures.reaction.findMany.mockRejectedValue(new Error("private storage detail"));
    const response = await fetch(
      `${origin}/api/memories/01900000-0000-7000-8000-000000000004/reactions`,
    );
    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload).toMatchObject({ ok: false, data: null });
    expect(JSON.stringify(payload)).not.toContain("private storage detail");
  });

  it("rejects missing membership and inaccessible memory", async () => {
    const path = `${origin}/api/memories/01900000-0000-7000-8000-000000000004/reactions`;
    const missing = await fetch(path);
    expect(missing.status).toBe(404);
    expect(fixtures.memory.findFirst.mock.calls[0][0].where).toMatchObject({
      spaceId: "01900000-0000-7000-8000-000000000005",
      deletedAt: null,
      space: { deletedAt: null, members: { some: { userId: "user-a", deletedAt: null } } },
    });
    fixtures.member.findFirst.mockResolvedValue(null);
    const noMembership = await fetch(path);
    expect(noMembership.status).toBe(404);
    expect(await noMembership.json()).toMatchObject({ message: "An active space is required." });
    const post = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"reactionType":"heart"}',
    });
    expect(post.status).toBe(404);
    expect(await post.json()).toMatchObject({ message: "An active space is required." });
    expect(fixtures.reaction.create).not.toHaveBeenCalled();
  });
});
