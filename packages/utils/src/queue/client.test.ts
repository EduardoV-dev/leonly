import { describe, expect, it } from "vitest";
import { createSqsClient, validateSqsUrl } from "./client";

describe("shared SQS configuration", () => {
  it("keeps explicit region, local endpoints and a single attempt", async () => {
    const client = createSqsClient({ region: "us-east-1", endpoint: "http://localhost:4566" });
    try {
      expect(await client.config.region()).toBe("us-east-1");
      expect(await client.config.maxAttempts()).toBe(1);
      expect(await client.config.endpoint?.()).toMatchObject({
        protocol: "http:",
        hostname: "localhost",
        port: 4566,
      });
    } finally {
      client.destroy();
    }
  });

  it("allows AWS endpoint and credential discovery without explicit credentials", () => {
    const client = createSqsClient({ region: "us-east-1" });
    expect(client.config.endpoint).toBeUndefined();
    expect(client.config.credentials).toBeTypeOf("function");
    client.destroy();
  });

  it.each(["", "   "])("rejects an empty region", (region) => {
    expect(() => createSqsClient({ region })).toThrow("SQS region is required");
  });

  it.each([
    "file:///tmp/queue",
    "https://user:secret@example.com/queue",
    "https://example.com/queue?secret=value",
    "https://example.com/queue#fragment",
    "not-a-url",
  ])("rejects invalid queue and service URLs: %s", (endpoint) => {
    expect(() => validateSqsUrl(endpoint)).toThrow();
    expect(() => createSqsClient({ region: "us-east-1", endpoint })).toThrow();
  });

  it("accepts queue paths", () => {
    expect(() =>
      validateSqsUrl("https://sqs.us-east-1.amazonaws.com/123456789012/images"),
    ).not.toThrow();
  });
});
