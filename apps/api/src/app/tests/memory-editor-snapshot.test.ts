import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiApp } from "../create-app/create-app";

const fixtures = vi.hoisted(() => ({
  authenticated: true,
  memory: vi.fn(),
  findMember: vi.fn(),
  signObject: vi.fn(),
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
    memory = { findFirst: fixtures.memory };
    spaceMember = { findFirst: fixtures.findMember };
  },
}));
vi.mock("../../common/rate-limit/guards/rate-limit.guard", () => ({
  RateLimitGuard: class {
    canActivate() {
      return true;
    }
  },
}));
vi.mock("@leonly/utils/storage", () => ({
  ObjectStorage: class {
    signObject = fixtures.signObject;
  },
  UPLOAD_URL_SECONDS: 600,
}));

const memoryId = "01900000-0000-7000-8000-000000000004";
const spaceId = "01900000-0000-7000-8000-000000000005";

describe("authenticated memory editor snapshot endpoint", () => {
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
    fixtures.signObject.mockReset().mockResolvedValue("https://signed/detail-key");
    fixtures.findMember.mockReset().mockResolvedValue({ id: "member", spaceId });
    fixtures.memory.mockReset().mockResolvedValue({
      id: memoryId,
      title: "Our picnic",
      description: null,
      location: null,
      memoryDate: new Date("2026-08-20T00:00:00.000Z"),
      visibility: "timeline",
      updatedAt: new Date("2026-09-05T16:00:00.123Z"),
      coverFileId: "photo-ready",
      memoryFiles: [
        {
          fileId: "photo-ready",
          file: { status: "ready", variants: [{ objectKey: "detail-key" }] },
        },
        { fileId: "photo-pending", file: { status: "uploaded", variants: [] } },
      ],
    });
  });

  it("returns the editable snapshot with nullable previews and no storage keys", async () => {
    const response = await fetch(`${origin}/api/memories/${memoryId}/edit`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const payload = await response.json();
    expect(payload).toMatchObject({
      ok: true,
      data: {
        id: memoryId,
        title: "Our picnic",
        memoryDate: "2026-08-20",
        visibility: "timeline",
        updatedAt: "2026-09-05T16:00:00.123Z",
        coverFileId: "photo-ready",
        photos: [
          { id: "photo-ready", previewUrl: "https://signed/detail-key" },
          { id: "photo-pending", previewUrl: null },
        ],
      },
      error: [],
    });
    expect(JSON.stringify(payload)).not.toContain("objectKey");
  });

  it("rejects unauthenticated requests without any memory lookup", async () => {
    fixtures.authenticated = false;
    const response = await fetch(`${origin}/api/memories/${memoryId}/edit`);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, data: null });
    expect(fixtures.memory).not.toHaveBeenCalled();
  });

  it("rejects malformed identifiers before any lookup", async () => {
    const response = await fetch(`${origin}/api/memories/invalid/edit`);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      message: "Memory id is not valid.",
      error: [{ code: "HTTP_400", message: "Memory id is not valid." }],
    });
    expect(fixtures.memory).not.toHaveBeenCalled();
  });

  it("returns generic not-found when membership or the memory is unavailable", async () => {
    fixtures.findMember.mockResolvedValueOnce(null);
    const withoutMembership = await fetch(`${origin}/api/memories/${memoryId}/edit`);
    expect(withoutMembership.status).toBe(404);
    expect(await withoutMembership.json()).toMatchObject({ ok: false, data: null });

    fixtures.memory.mockResolvedValueOnce(null);
    const withoutMemory = await fetch(`${origin}/api/memories/${memoryId}/edit`);
    expect(withoutMemory.status).toBe(404);
    expect(await withoutMemory.json()).toMatchObject({
      ok: false,
      data: null,
      error: [{ message: "Memory unavailable." }],
    });
  });

  it("returns a safe failure without leaking lookup details", async () => {
    fixtures.memory.mockRejectedValue(new Error("private lookup details"));
    const response = await fetch(`${origin}/api/memories/${memoryId}/edit`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("private lookup details");
  });

  it("documents the snapshot operation with nullable previews", () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const paths = document.paths as Record<
      string,
      Record<string, { responses?: Record<string, unknown> }> | undefined
    >;
    const operation = paths["/api/memories/{memoryId}/edit"]?.get;
    expect(operation).toBeDefined();
    expect(operation?.responses).toHaveProperty("200");
    expect(operation?.responses).toHaveProperty("404");
    expect(JSON.stringify(operation)).toContain('"previewUrl"');
    expect(JSON.stringify(operation)).toContain('"nullable":true');
  });
});
