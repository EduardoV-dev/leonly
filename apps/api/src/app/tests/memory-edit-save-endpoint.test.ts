import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiApp } from "../create-app/create-app";
import { createEditSaveRequest, EDIT_MEMORY_ID, INITIAL_EDIT_TOKEN } from "./edit-fixtures";

const fixtures = vi.hoisted(() => ({
  authenticated: true,
  state: {
    uploads: new Map<string, never>(),
    memories: [] as {
      id: string;
      spaceId: string;
      deletedAt: null;
      visibility: "timeline" | "vault";
      updatedAt: Date;
      coverFileId: string | null;
      [key: string]: unknown;
    }[],
    memoryFiles: [] as never[],
    events: [] as never[],
    hasActiveMembership: true,
    isInTransaction: false,
    rollbacks: 0,
  },
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
vi.mock("../../common/prisma/prisma.service", async () => {
  const { createEditPrismaStub } = await import("./edit-prisma-stub");

  return {
    PrismaService: class {
      constructor() {
        Object.assign(
          this,
          createEditPrismaStub({
            state: fixtures.state as never,
            runTransaction: async (operation: (transaction: unknown) => Promise<unknown>) =>
              operation(this),
          }),
        );
      }
    },
  };
});
vi.mock("../../common/rate-limit/guards/rate-limit.guard", () => ({
  RateLimitGuard: class {
    canActivate() {
      return true;
    }
  },
}));

const memoryId = EDIT_MEMORY_ID;

describe("authenticated memory edit save endpoint", () => {
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
    fixtures.state.hasActiveMembership = true;
    fixtures.state.memories = [
      {
        id: memoryId,
        spaceId: "01900000-0000-7000-8000-000000000005",
        deletedAt: null,
        visibility: "timeline",
        updatedAt: INITIAL_EDIT_TOKEN,
        coverFileId: null,
        title: "Our picnic",
        description: null,
        location: null,
        memoryDate: new Date("2026-10-10T00:00:00.000Z"),
      },
    ];
  });

  const saveRequest = createEditSaveRequest({ memoryDate: "2026-10-10" });

  it("returns the committed token with a no-store envelope after the transaction", async () => {
    const response = await fetch(`${origin}/api/memories/${memoryId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(saveRequest),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const payload = await response.json();
    expect(payload).toMatchObject({
      ok: true,
      data: { id: memoryId, visibility: "timeline" },
      error: [],
    });
    expect(new Date((payload.data as { updatedAt: string }).updatedAt).getTime()).toBeGreaterThan(
      INITIAL_EDIT_TOKEN.getTime(),
    );
    expect(fixtures.state.events).toHaveLength(0);
  });

  it("rejects unauthenticated saves without touching the memory", async () => {
    fixtures.authenticated = false;
    const response = await fetch(`${origin}/api/memories/${memoryId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(saveRequest),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, data: null });
    expect(fixtures.state.memories[0]?.title).toBe("Our picnic");
  });

  it("rejects malformed identifiers and unavailable memories generically", async () => {
    const malformed = await fetch(`${origin}/api/memories/invalid`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(saveRequest),
    });
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toMatchObject({ message: "Memory id is not valid." });

    fixtures.state.memories = [];
    const unavailable = await fetch(`${origin}/api/memories/${memoryId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(saveRequest),
    });
    expect(unavailable.status).toBe(404);
    expect(await unavailable.json()).toMatchObject({
      ok: false,
      data: null,
      error: [{ code: "HTTP_404", message: "Memory unavailable." }],
    });
  });

  it("returns a conflict envelope when the submitted token no longer matches", async () => {
    const staleRequest = {
      ...saveRequest,
      lastKnownUpdatedAt: "2026-01-01T00:00:00.000000Z",
    };
    const response = await fetch(`${origin}/api/memories/${memoryId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(staleRequest),
    });
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload).toMatchObject({ ok: false, data: null });
    expect(JSON.stringify(payload)).toContain("This resource may have changed");
  });

  it("documents the committed save operation with conflict and strict body", () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const paths = document.paths as Record<string, Record<string, Record<string, unknown>>>;
    const operation = paths["/api/memories/{memoryId}"]?.patch;
    expect(operation).toBeDefined();
    expect(operation?.requestBody).toBeDefined();
    expect(operation?.responses).toHaveProperty("200");
    expect(operation?.responses).toHaveProperty("409");
    const documentJson = JSON.stringify(document);
    expect(documentJson).toContain('"lastKnownUpdatedAt"');
    expect(documentJson).toContain('"retainedPhotoIds"');
    expect(documentJson).toContain('"uploadIds"');
    expect(documentJson).toContain('"coverFileId"');
  });
});
