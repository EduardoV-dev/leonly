import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiApp } from "../create-app/create-app";

const fixtures = vi.hoisted(() => ({
  authenticated: true,
  query: vi.fn(),
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

describe("authenticated placement endpoint", () => {
  let app: Awaited<ReturnType<typeof createApiApp>>;
  let origin: string;
  const id = "01900000-0000-7000-8000-000000000004";
  const timestamp = "2026-10-01T12:00:00.123Z";

  beforeAll(async () => {
    app = await createApiApp();
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    fixtures.authenticated = true;
    fixtures.query.mockReset();
    fixtures.findFirst.mockReset().mockResolvedValue({ id });
    fixtures.findMember.mockReset().mockResolvedValue({
      id: "member",
      spaceId: "01900000-0000-7000-8000-000000000005",
    });
  });

  it.each(["timeline", "vault"])("moves to %s with an exact result", async (visibility) => {
    fixtures.query.mockResolvedValueOnce([
      { id, visibility, updatedAt: "2026-10-01T12:00:00.124Z" },
    ]);
    const response = await fetch(`${origin}/api/memories/${id}/placement`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibility, lastKnownUpdatedAt: timestamp }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { id, visibility, updatedAt: "2026-10-01T12:00:00.124Z" },
      error: [],
    });
  });

  it("rejects unauthenticated and malformed paths without querying memory", async () => {
    const request = {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibility: "vault", lastKnownUpdatedAt: timestamp }),
    };
    fixtures.authenticated = false;
    expect((await fetch(`${origin}/api/memories/invalid/placement`, request)).status).toBe(401);
    fixtures.authenticated = true;
    expect((await fetch(`${origin}/api/memories/invalid/placement`, request)).status).toBe(404);
    expect(fixtures.query).not.toHaveBeenCalled();
  });

  it("returns unavailable for missing membership and missing memory", async () => {
    const request = {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibility: "vault", lastKnownUpdatedAt: timestamp }),
    };
    fixtures.findMember.mockResolvedValueOnce(null);
    const withoutMembership = await fetch(`${origin}/api/memories/${id}/placement`, request);
    fixtures.findFirst.mockResolvedValueOnce(null);
    const withoutMemory = await fetch(`${origin}/api/memories/${id}/placement`, request);
    expect(withoutMembership.status).toBe(404);
    expect(withoutMemory.status).toBe(404);
    expect(await withoutMembership.json()).toMatchObject({ ok: false });
    expect(await withoutMemory.json()).toMatchObject({ ok: false });
  });

  it("uses the same unavailable response for malformed identifiers and unavailable records", async () => {
    const request = {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibility: "vault", lastKnownUpdatedAt: timestamp }),
    };
    const malformed = await fetch(`${origin}/api/memories/invalid/placement`, request);
    fixtures.findFirst.mockResolvedValueOnce(null);
    const unavailable = await fetch(`${origin}/api/memories/${id}/placement`, request);
    expect(malformed.status).toBe(404);
    expect(unavailable.status).toBe(404);
    expect(await malformed.json()).toEqual(await unavailable.json());
    expect(fixtures.query).not.toHaveBeenCalled();
  });

  it("returns conflict when an eligible memory has a stale timestamp", async () => {
    fixtures.query.mockResolvedValueOnce([]);
    const response = await fetch(`${origin}/api/memories/${id}/placement`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibility: "vault", lastKnownUpdatedAt: timestamp }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, data: null });
  });

  it("rejects forged fields and hides unexpected database failures", async () => {
    const url = `${origin}/api/memories/${id}/placement`;
    const request = { method: "PATCH", headers: { "content-type": "application/json" } };
    const invalid = await fetch(url, {
      ...request,
      body: JSON.stringify({
        visibility: "vault",
        lastKnownUpdatedAt: timestamp,
        spaceId: "forged",
      }),
    });
    expect(invalid.status).toBe(400);
    expect(fixtures.query).not.toHaveBeenCalled();
    fixtures.query.mockRejectedValueOnce(new Error("private database details"));
    const failure = await fetch(url, {
      ...request,
      body: JSON.stringify({ visibility: "vault", lastKnownUpdatedAt: timestamp }),
    });
    expect(failure.status).toBe(500);
    expect(JSON.stringify(await failure.json())).not.toContain("private database details");
  });

  it("documents the placement body, responses and precision", () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const operation = document.paths["/api/memories/{memoryId}/placement"]?.patch;
    expect(operation).toBeDefined();
    expect(operation?.responses).toHaveProperty("200");
    expect(operation?.responses).toHaveProperty("400");
    expect(operation?.responses).toHaveProperty("401");
    expect(operation?.responses).toHaveProperty("404");
    expect(operation?.responses).toHaveProperty("409");
    expect(operation?.responses).toHaveProperty("500");
    expect(JSON.stringify(document.components?.schemas?.PlaceMemoryDto)).toContain(
      "lastKnownUpdatedAt",
    );
    expect(JSON.stringify(document.components?.schemas?.PlaceMemoryDto)).toContain("visibility");
    expect(JSON.stringify(operation?.responses)).toContain("123Z");
  });
});
