import type { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from "aws-lambda";
import { afterAll, describe, expect, it, vi } from "vitest";
import { handler } from "../../lambda";
import { createApiApp } from "../create-app/create-app";

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
vi.mock("../../common/prisma/prisma.service", () => ({ PrismaService: class {} }));

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

async function invoke(path: string): Promise<APIGatewayProxyResult> {
  const event: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: `GET ${path}`,
    rawPath: path,
    rawQueryString: "",
    headers: { host: "api.example.com", "x-forwarded-proto": "https" },
    requestContext: {
      accountId: "000000000000",
      apiId: "api",
      domainName: "api.example.com",
      domainPrefix: "api",
      http: { method: "GET", path, protocol: "HTTP/1.1", sourceIp: "127.0.0.1", userAgent: "test" },
      requestId: "request-id",
      routeKey: `GET ${path}`,
      stage: "$default",
      time: "01/Nov/2026:00:00:00 +0000",
      timeEpoch: 0,
    },
    isBase64Encoded: false,
  };

  return handler(event, context, vi.fn());
}

afterAll(async () => {
  const app = await vi.mocked(createApiApp).mock.results[0]?.value;
  await app?.close();
});

describe("Lambda API documentation", () => {
  it("serves Scalar outside the API prefix", async () => {
    const response = await invoke("/docs");

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("/openapi.json");
  });

  it("serves OpenAPI with prefixed operations and concrete request DTOs", async () => {
    const response = await invoke("/openapi.json");

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
