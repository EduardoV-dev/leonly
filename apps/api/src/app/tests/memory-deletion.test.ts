import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiApp } from "../create-app/create-app";

const fixtures = vi.hoisted(() => ({
  authenticated: true,
  query: vi.fn(),
  execute: vi.fn(),
  findFirst: vi.fn(),
  findMember: vi.fn(),
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
    $queryRaw = fixtures.query;
    $executeRaw = fixtures.execute;
    memory = { findFirst: fixtures.findFirst };
    spaceMember = { findFirst: fixtures.findMember };
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
const spaceId = "01900000-0000-7000-8000-000000000005";

describe("authenticated memory deletion endpoint", () => {
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
    fixtures.query.mockReset().mockResolvedValue([{ id: "member", spaceId }]);
    fixtures.execute.mockReset().mockResolvedValue(1);
    fixtures.findFirst.mockReset().mockResolvedValue({ id: memoryId });
    fixtures.findMember.mockReset().mockResolvedValue({ id: "member", spaceId });
  });

  it("deletes the current state with a bodyless request and null data", async () => {
    const response = await fetch(`${origin}/api/memories/${memoryId}`, { method: "DELETE" });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      ok: true,
      data: null,
      error: [],
      message: expect.any(String),
    });

    const statements = fixtures.execute.mock.calls.map((call) => call[0].join(" "));
    expect(statements).toHaveLength(4);
    const order = ["memory_comments", "memory_reactions", "files", "memories"];
    const indexes = order.map((table) =>
      statements.findIndex((sql) => sql.includes(`UPDATE ${table}`)),
    );
    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes);
  });

  it("deletes without any version token even when a body is sent", async () => {
    const response = await fetch(`${origin}/api/memories/${memoryId}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lastKnownUpdatedAt: "2026-09-05T16:00:00.123Z" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, data: null });
  });

  it("rejects unauthenticated requests without any cascade write", async () => {
    fixtures.authenticated = false;
    const response = await fetch(`${origin}/api/memories/${memoryId}`, { method: "DELETE" });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, data: null });
    expect(fixtures.execute).not.toHaveBeenCalled();
  });

  it("returns a validation failure for malformed identifiers and not-found for unavailable ones", async () => {
    const malformed = await fetch(`${origin}/api/memories/invalid`, { method: "DELETE" });
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toMatchObject({
      message: "Memory id is not valid.",
      error: [{ code: "HTTP_400", message: "Memory id is not valid." }],
    });
    expect(fixtures.execute).not.toHaveBeenCalled();

    fixtures.findFirst.mockResolvedValue(null);
    const unavailable = await fetch(`${origin}/api/memories/${memoryId}`, { method: "DELETE" });
    expect(unavailable.status).toBe(404);
    expect(await unavailable.json()).toMatchObject({ ok: false, data: null });
    expect(fixtures.execute).not.toHaveBeenCalled();
  });

  it("returns generic not-found when membership or memory become unavailable", async () => {
    fixtures.query
      .mockReset()
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: "member", spaceId }]);
    const withoutMembership = await fetch(`${origin}/api/memories/${memoryId}`, {
      method: "DELETE",
    });
    expect(withoutMembership.status).toBe(404);
    expect(fixtures.execute).not.toHaveBeenCalled();

    fixtures.findFirst.mockResolvedValueOnce(null);
    const withoutMemory = await fetch(`${origin}/api/memories/${memoryId}`, { method: "DELETE" });
    expect(withoutMemory.status).toBe(404);
    expect(fixtures.execute).not.toHaveBeenCalled();
  });

  it("returns a safe failure without partial cascade writes on unexpected errors", async () => {
    fixtures.execute.mockRejectedValueOnce(new Error("private cascade details"));
    const response = await fetch(`${origin}/api/memories/${memoryId}`, { method: "DELETE" });
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("private cascade details");
  });

  it("documents the bodyless deletion operation without a version-conflict response", () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const operation = document.paths["/api/memories/{memoryId}"]?.delete;
    expect(operation).toBeDefined();
    expect(operation?.requestBody).toBeUndefined();
    expect(operation?.responses).toHaveProperty("200");
    expect(operation?.responses).toHaveProperty("400");
    expect(operation?.responses).toHaveProperty("401");
    expect(operation?.responses).toHaveProperty("404");
    expect(operation?.responses).toHaveProperty("500");
    expect(operation?.responses).not.toHaveProperty("409");
    expect(JSON.stringify(operation)).toContain('"data":null');
  });
});
