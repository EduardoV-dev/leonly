import { ObjectStorage } from "@leonly/utils/storage";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiApp } from "../../app/create-app";
import { creationRequest } from "../memories/creation-fixtures";
import { MAX_IMAGE_BYTES } from "./upload-validation";

const fixtures = vi.hoisted(() => ({
  member: { findFirst: vi.fn() },
  uploads: { createMany: vi.fn() },
  memory: { findUnique: vi.fn(), create: vi.fn() },
  transactionMembership: vi.fn(),
  authenticated: true,
}));

vi.mock("../../common/config/environment-variables.config", () => ({
  ENVIRONMENT_VARIABLES: {
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
    STORAGE_ENDPOINT: "http://internal-floci:4566",
    STORAGE_SIGNING_ENDPOINT: "http://localhost:4566",
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
    fileUpload = fixtures.uploads;
    memory = fixtures.memory;
    $queryRaw = fixtures.transactionMembership;
    async $transaction(operation: (transaction: unknown) => Promise<unknown>) {
      return operation(this);
    }
  },
}));
vi.mock("../../common/rate-limit/rate-limit.guard", () => ({
  RateLimitGuard: class {
    canActivate() {
      return true;
    }
  },
}));

const descriptor = { filename: "photo.jpg", contentType: "image/jpeg", byteSize: 1024 };

describe("authenticated upload issuance", () => {
  let app: Awaited<ReturnType<typeof createApiApp>>;
  let origin: string;

  beforeAll(async () => {
    app = await createApiApp();
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    fixtures.authenticated = true;
    fixtures.member.findFirst.mockResolvedValue({
      spaceId: "01900000-0000-7000-8000-000000000005",
    });
    fixtures.uploads.createMany.mockReset().mockResolvedValue({ count: 1 });
    fixtures.memory.findUnique.mockReset().mockResolvedValue(null);
    fixtures.memory.create
      .mockReset()
      .mockResolvedValue({ id: "01900000-0000-7000-8000-000000000004", visibility: "timeline" });
    fixtures.transactionMembership.mockReset().mockResolvedValue([{ id: "membership" }]);
  });

  async function issue(body: unknown): Promise<Response> {
    return fetch(`${origin}/api/files/uploads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("persists ordered ownership and both keys before returning exact signed staging capabilities", async () => {
    const response = await issue({
      purpose: "memory_image",
      files: [descriptor, { ...descriptor, filename: "second.jpg" }],
    });
    expect(response.status).toBe(201);
    const {
      ok,
      data: { uploads },
    } = await response.json();
    expect(ok).toBe(true);
    const records = fixtures.uploads.createMany.mock.calls[0][0].data;
    expect(records).toHaveLength(2);
    for (let index = 0; index < uploads.length; index++) {
      const upload = uploads[index];
      const record = records[index];
      const url = new URL(upload.putUrl);
      expect(url.origin).toBe("http://localhost:4566");
      expect(url.pathname).toBe(`/private-photos/${record.stagingKey}`);
      expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
      const signingDate = url.searchParams
        .get("X-Amz-Date")
        ?.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z");
      expect(new Date(upload.expiresAt).getTime() - new Date(signingDate ?? "").getTime()).toBe(
        600_000,
      );
      expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
      expect(url.searchParams.has("x-amz-checksum-crc32")).toBe(false);
      expect(upload.requiredHeaders).toEqual({ "Content-Type": "image/jpeg" });
      expect(record).toMatchObject({
        id: upload.id,
        uploaderUserId: "user-a",
        purpose: "memory_image",
        category: "image",
      });
      expect(record.intendedFinalKey).toBe(`memories/${record.spaceId}/${record.id}/original`);
      expect(
        new Date(upload.attachmentDeadline).getTime() - new Date(upload.expiresAt).getTime(),
      ).toBe(3_600_000);
      expect(record.uploadUrlExpiresAt.toISOString()).toBe(upload.expiresAt);
    }
    expect(records.map((record: { originalFilename: string }) => record.originalFilename)).toEqual([
      "photo.jpg",
      "second.jpg",
    ]);
  });

  it("does not sign or issue capabilities when persistence fails", async () => {
    fixtures.uploads.createMany.mockRejectedValueOnce(new Error("private database error"));
    const signer = vi.spyOn(app.get(ObjectStorage), "signUpload");
    try {
      const response = await issue({ purpose: "memory_image", files: [descriptor] });
      expect(response.status).toBe(500);
      expect(signer).not.toHaveBeenCalled();
      expect(JSON.stringify(await response.json())).not.toContain("private database error");
    } finally {
      signer.mockRestore();
    }
  });

  it("requires authentication and an available membership", async () => {
    fixtures.authenticated = false;
    expect((await issue({ purpose: "memory_image", files: [descriptor] })).status).toBe(401);
    fixtures.authenticated = true;
    fixtures.member.findFirst.mockResolvedValueOnce(null);
    expect((await issue({ purpose: "memory_image", files: [descriptor] })).status).toBe(404);
    expect(fixtures.uploads.createMany).not.toHaveBeenCalled();
  });

  it.each([
    { purpose: "avatar", files: [descriptor] },
    { purpose: "memory_image", files: [] },
    { purpose: "memory_image", files: Array.from({ length: 11 }, () => descriptor) },
    ...[0, -1, 1.5, MAX_IMAGE_BYTES + 1, "1024"].map((byteSize) => ({
      purpose: "memory_image",
      files: [{ ...descriptor, byteSize }],
    })),
    ...["image/gif", "image/svg+xml"].map((contentType) => ({
      purpose: "memory_image",
      files: [{ ...descriptor, contentType }],
    })),
    ...["photo.png", "../photo.jpg", "photo", "photo.jpg\n"].map((filename) => ({
      purpose: "memory_image",
      files: [{ ...descriptor, filename }],
    })),
    { purpose: "memory_image", spaceId: "foreign", files: [descriptor] },
    { purpose: "memory_image", uploaderUserId: "foreign", files: [descriptor] },
    { purpose: "memory_image", files: [{ ...descriptor, stagingKey: "forged" }] },
    { purpose: "memory_image", files: [{ ...descriptor, intendedFinalKey: "forged" }] },
  ])("rejects invalid or client-controlled descriptors: %j", async (body) => {
    const response = await issue(body);
    expect(response.status).toBe(400);
    expect(fixtures.uploads.createMany).not.toHaveBeenCalled();
  });

  it("accepts maximum count/size and all allowed extensions without decoding descriptors", async () => {
    const files = Array.from({ length: 10 }, (_, index) => ({
      filename: index % 2 ? "PHOTO.WEBP" : "PHOTO.PNG",
      contentType: index % 2 ? "image/webp" : "image/png",
      byteSize: MAX_IMAGE_BYTES,
    }));
    expect((await issue({ purpose: "memory_image", files })).status).toBe(201);
  });

  it("serves authenticated JSON memory creation through the established envelope and validation", async () => {
    const post = (body: unknown) =>
      fetch(`${origin}/api/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    fixtures.authenticated = false;
    expect((await post(creationRequest())).status).toBe(401);
    fixtures.authenticated = true;
    expect((await post({ ...creationRequest(), createdByUserId: "forged" })).status).toBe(400);
    const response = await post(creationRequest());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { id: expect.any(String), visibility: "timeline" },
      error: [],
    });
    const persisted = fixtures.memory.create.mock.calls[0][0].data;
    expect(persisted.createdByUserId).toBe("user-a");
  });
});
