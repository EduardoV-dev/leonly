import { describe, expect, it } from "vitest";
import { createStorageClient, validateStorageConfiguration } from "./client";

describe("storage credential resolution", () => {
  it("uses AWS endpoint and credential discovery when no overrides are supplied", () => {
    const client = createStorageClient({ region: "us-east-1", bucket: "photos" });
    try {
      expect(client.config.endpoint).toBeUndefined();
      expect(client.config.credentials).toBeTypeOf("function");
      expect(client.config.forcePathStyle).toBe(false);
    } finally {
      client.destroy();
    }
  });

  it("rejects partial explicit credentials", () => {
    expect(() =>
      validateStorageConfiguration({ region: "us-east-1", bucket: "photos", accessKeyId: "local" }),
    ).toThrow("Storage secretAccessKey is required");
  });
});
