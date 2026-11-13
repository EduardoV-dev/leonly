import type { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from "aws-lambda";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { handler } from "../../lambda";
import { createApiApp } from "../create-app/create-app";
import { rateLimitStorage } from "./rate-limit-setup";

const BODY_LIMIT_BYTES = 1024 * 1024;
const { createVerification } = vi.hoisted(() => ({ createVerification: vi.fn() }));

vi.mock("dotenv/config", () => ({}));

vi.mock("../create-app/create-app", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../create-app/create-app")>();

  return { ...actual, createApiApp: vi.fn(actual.createApiApp) };
});
vi.mock("../../common/configs/environment-variables.config", () => ({
  ENVIRONMENT_VARIABLES: {
    BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    WEB_APP_ORIGIN: "https://app.example.com",
    STORAGE_ENDPOINT: "http://localhost:4566",
    STORAGE_REGION: "us-east-1",
    STORAGE_BUCKET: "test-bucket",
    STORAGE_ACCESS_KEY_ID: "test-access",
    STORAGE_SECRET_ACCESS_KEY: "test-secret",
    SQS_QUEUES_URLS: { memories: "http://localhost:4566/000000000000/images" },
    AWS_REGION: "us-east-1",
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  },
  getWebAppOrigin: () => "https://app.example.com",
}));
vi.mock("../../common/prisma/prisma.service", () => ({
  PrismaService: class {
    verification = { create: createVerification };
  },
}));

const context: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "api",
  functionVersion: "$LATEST",
  invokedFunctionArn: "arn:aws:lambda:us-east-1:000000000000:function:api",
  memoryLimitInMB: "512",
  awsRequestId: "request-id",
  logGroupName: "test",
  logStreamName: "test",
  getRemainingTimeInMillis: () => 30_000,
  done: vi.fn(),
  fail: vi.fn(),
  succeed: vi.fn(),
};

type InvokeParams = {
  path: string;
  method?: "GET" | "POST";
  body?: string;
  contentType?: string;
};

async function invoke({
  path,
  method = "GET",
  body,
  contentType = "application/json",
}: InvokeParams): Promise<APIGatewayProxyResult> {
  const event: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: "",
    headers: {
      host: "api.example.com",
      "x-forwarded-proto": "https",
      origin: "https://app.example.com",
      ...(body === undefined
        ? {}
        : { "content-type": contentType, "content-length": String(Buffer.byteLength(body)) }),
    },
    requestContext: {
      accountId: "000000000000",
      apiId: "api",
      domainName: "api.example.com",
      domainPrefix: "api",
      http: { method, path, protocol: "HTTP/1.1", sourceIp: "127.0.0.1", userAgent: "test" },
      requestId: "request-id",
      routeKey: `${method} ${path}`,
      stage: "$default",
      time: "01/Nov/2026:00:00:00 +0000",
      timeEpoch: 0,
    },
    isBase64Encoded: false,
    body,
  };

  return handler(event, context, vi.fn());
}

beforeEach(() => {
  vi.stubEnv("AWS_LAMBDA_FUNCTION_NAME", "api");
  createVerification.mockReset();
  createVerification.mockImplementation(({ data }) => data);
});

afterAll(async () => {
  const app = await vi.mocked(createApiApp).mock.results[0]?.value;
  await app?.close();
  vi.unstubAllEnvs();
});

describe("Lambda API documentation", () => {
  it("serves Scalar outside the API prefix", async () => {
    const response = await invoke({ path: "/docs" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("/openapi.json");
  });

  it("serves OpenAPI with prefixed operations and concrete request DTOs", async () => {
    const response = await invoke({ path: "/openapi.json" });

    expect(response.statusCode).toBe(200);
    const document = JSON.parse(response.body);

    expect(document.paths).toHaveProperty("/api/memories");
    expect(document.components.schemas.IssueUploadsDto.required).toEqual(["purpose", "files"]);
    expect(document.components.schemas.UploadFileDto.required).toEqual([
      "filename",
      "contentType",
      "byteSize",
    ]);
    expect(document.components.schemas.CreateMemoryDto.required).toContain("idempotencyKey");
  });
});

describe("Lambda request bodies", () => {
  it("starts Google sign-in after an asynchronous rate-limit check", async () => {
    rateLimitStorage.limit.mockImplementation(async () => {
      await new Promise<void>((resolve) => setImmediate(resolve));
      return { success: true, reset: Date.now() + 60_000, pending: Promise.resolve() };
    });

    const response = await invoke({
      path: "/api/auth/sign-in/social",
      method: "POST",
      body: JSON.stringify({
        provider: "google",
        callbackURL: "https://app.example.com/welcome/create/start",
      }),
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);
    expect(new URL(result.url).hostname).toBe("accounts.google.com");
    expect(createVerification).toHaveBeenCalledOnce();
  });

  it("still rejects sign-in when the limiter denies the request", async () => {
    rateLimitStorage.limit.mockResolvedValue({
      success: false,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const response = await invoke({
      path: "/api/auth/sign-in/social",
      method: "POST",
      body: JSON.stringify({ provider: "google" }),
    });

    expect(response.statusCode).toBe(429);
    expect(createVerification).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before starting authentication", async () => {
    const response = await invoke({
      path: "/api/auth/sign-in/social",
      method: "POST",
      body: '{"provider":',
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ ok: false, data: null });
    expect(createVerification).not.toHaveBeenCalled();
  });

  it.each(["application/json", "application/x-www-form-urlencoded"])(
    "accepts a %s body of exactly 1 MiB through parsing",
    async (contentType) => {
      const prefix = contentType === "application/json" ? '{"padding":"' : "padding=";
      const suffix = contentType === "application/json" ? '"}' : "";
      const body = `${prefix}${"x".repeat(BODY_LIMIT_BYTES - prefix.length - suffix.length)}${suffix}`;

      const response = await invoke({ path: "/api/spaces", method: "POST", contentType, body });

      // Authentication rejects the anonymous request only after the parser accepts its body.
      expect(response.statusCode).toBe(401);
    },
  );

  it.each(["application/json", "application/x-www-form-urlencoded"])(
    "rejects a %s body above 1 MiB before authentication",
    async (contentType) => {
      const prefix = contentType === "application/json" ? '{"padding":"' : "padding=";
      const suffix = contentType === "application/json" ? '"}' : "";
      const body = `${prefix}${"x".repeat(BODY_LIMIT_BYTES + 1 - prefix.length - suffix.length)}${suffix}`;

      const response = await invoke({
        path: "/api/auth/sign-in/social",
        method: "POST",
        contentType,
        body,
      });

      expect(response.statusCode).toBe(413);
      expect(JSON.parse(response.body)).toMatchObject({
        ok: false,
        data: null,
        error: [{ code: "HTTP_413", message: "The request body is too large." }],
      });
      expect(createVerification).not.toHaveBeenCalled();
    },
  );
});
