import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiApp } from "../create-app/create-app";

const fixtures = vi.hoisted(() => ({
  authenticated: true,
  member: { findFirst: vi.fn() },
  memory: { findFirst: vi.fn() },
  comment: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  query: vi.fn(),
}));

vi.mock("../../common/configs/environment-variables.config", () => ({
  ENVIRONMENT_VARIABLES: {
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "test",
    STORAGE_ENDPOINT: "http://localhost:4566",
    STORAGE_REGION: "us-east-1",
    STORAGE_BUCKET: "test",
    STORAGE_ACCESS_KEY_ID: "test",
    STORAGE_SECRET_ACCESS_KEY: "test",
    SQS_QUEUES_URLS: { memories: "http://localhost/queue" },
    AWS_REGION: "us-east-1",
  },
  getWebAppOrigin: () => "http://localhost:3000",
}));
vi.mock("../../auth/auth.service", () => ({
  AuthService: class {
    auth = { handler: async () => new Response(null, { status: 401 }) };
    getRequestUser() {
      return fixtures.authenticated ? { id: "user" } : null;
    }
  },
}));
vi.mock("../../common/prisma/prisma.service", () => ({
  PrismaService: class {
    spaceMember = fixtures.member;
    memory = fixtures.memory;
    memoryComment = fixtures.comment;
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

const memoryId = "01900000-0000-7000-8000-000000000004";
const commentId = "01900000-0000-7000-8000-000000000005";

describe("comment HTTP contract", () => {
  let app: Awaited<ReturnType<typeof createApiApp>>;
  let origin: string;
  beforeAll(async () => {
    app = await createApiApp();
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    fixtures.authenticated = true;
    fixtures.member.findFirst.mockResolvedValue({ id: commentId, spaceId: commentId });
    fixtures.memory.findFirst.mockResolvedValue({ id: memoryId });
    fixtures.query.mockResolvedValue([]);
  });

  it("returns an enveloped empty page and validates cursors", async () => {
    const response = await fetch(`${origin}/api/memories/${memoryId}/comments`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { data: [], meta: { nextCursor: null, resetCursor: false } },
    });
    expect((await fetch(`${origin}/api/memories/${memoryId}/comments?cursor=!`)).status).toBe(400);
  });

  it("propagates an unavailable membership on comment reads", async () => {
    fixtures.member.findFirst.mockResolvedValue(null);
    const response = await fetch(`${origin}/api/memories/${memoryId}/comments`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ message: "An active space is required." });
    expect(fixtures.memory.findFirst).not.toHaveBeenCalled();
  });

  it("requires a session and rejects malformed creation and locking fields", async () => {
    const path = `${origin}/api/memories/${memoryId}/comments`;
    fixtures.authenticated = false;
    expect((await fetch(path)).status).toBe(401);
    fixtures.authenticated = true;
    for (const body of [{ body: "  " }, { body: "x", userId: "forged" }]) {
      expect(
        (
          await fetch(path, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          })
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await fetch(`${path}/${commentId}`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedUpdatedAt: "2026-09-05T16:00:00.123456Z" }),
        })
      ).status,
    ).toBe(400);
    expect(fixtures.query).not.toHaveBeenCalled();
  });

  it("returns custom validation errors for malformed memory and comment IDs", async () => {
    const invalidMemory = await fetch(`${origin}/api/memories/invalid/comments`);
    expect(invalidMemory.status).toBe(400);
    expect(await invalidMemory.json()).toMatchObject({ message: "Memory id is not valid." });
    const invalidComment = await fetch(
      `${origin}/api/memories/${memoryId}/comments/invalid/replies`,
    );
    expect(invalidComment.status).toBe(400);
    expect(await invalidComment.json()).toMatchObject({ message: "Comment id is not valid." });
    const invalidReaction = await fetch(`${origin}/api/memories/invalid/reactions`);
    expect(invalidReaction.status).toBe(400);
    expect(await invalidReaction.json()).toMatchObject({ message: "Memory id is not valid." });
  });

  it("creates a comment without an idempotency key", async () => {
    fixtures.query
      .mockResolvedValueOnce([{ id: commentId, spaceId: commentId }])
      .mockResolvedValueOnce([{ id: memoryId }])
      .mockResolvedValueOnce([
        {
          id: commentId,
          memoryId,
          parentCommentId: null,
          body: "Hello",
          createdAt: "2026-09-05T16:00:00.123456Z",
          updatedAt: "2026-09-05T16:00:00.123456Z",
          replyCount: 0,
          authorDisplayName: "Author",
          authorAvatarUrl: null,
          isAuthor: true,
          deletedAt: null,
        },
      ]);
    fixtures.comment.create.mockResolvedValue({ id: commentId });
    const response = await fetch(`${origin}/api/memories/${memoryId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "Hello" }),
    });
    expect(response.status).toBe(201);
    expect(fixtures.query.mock.calls[0][0].join(" ")).toContain("FOR UPDATE OF sm, s");
    expect(fixtures.query.mock.calls[1][0].join(" ")).toContain("FOR UPDATE");
    expect(await response.json()).toMatchObject({
      data: { id: commentId, body: "Hello", deletedAt: null },
    });
  });

  it("documents each route and response envelope", () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const root = document.paths["/api/memories/{memoryId}/comments"];
    const target = document.paths["/api/memories/{memoryId}/comments/{commentId}"];
    const replies = document.paths["/api/memories/{memoryId}/comments/{commentId}/replies"];
    for (const operation of [root?.get, root?.post, target?.patch, target?.delete, replies?.get]) {
      expect(operation?.responses).toHaveProperty("401");
      expect(operation?.responses).toHaveProperty("404");
      expect(JSON.stringify(operation?.responses)).toContain("ok");
    }
  });
});
