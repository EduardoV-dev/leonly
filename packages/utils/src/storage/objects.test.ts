import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObjectStorage } from "./objects";

const configuration = {
  endpoint: "http://storage.internal:4566",
  signingEndpoint: "http://localhost:4566",
  region: "us-east-1",
  bucket: "photos",
  accessKeyId: "local",
  secretAccessKey: "local",
};

afterEach(() => vi.restoreAllMocks());

describe("shared object storage", () => {
  it("signs browser uploads against the public endpoint with the required content type", async () => {
    const storage = new ObjectStorage(configuration);
    try {
      const url = new URL(
        await storage.signUpload({
          key: "staging/photo.png",
          contentType: "image/png",
          issuedAt: new Date("2026-10-11T00:00:00Z"),
        }),
      );
      expect(url.origin).toBe(configuration.signingEndpoint);
      expect(url.pathname).toBe("/photos/staging/photo.png");
      expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
      expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
    } finally {
      storage.destroy();
    }
  });

  it("bounds downloads and never overwrites an accepted object", async () => {
    const send = vi.spyOn(S3Client.prototype, "send");
    const destroyBody = vi.fn();
    send.mockImplementationOnce(async () => ({
      Body: {
        destroy: destroyBody,
        async *[Symbol.asyncIterator]() {
          yield Buffer.from("photo");
        },
      },
    }));
    send.mockRejectedValueOnce({ $metadata: { httpStatusCode: 412 } });
    const storage = new ObjectStorage(configuration);
    try {
      expect(await storage.getObject("original", 5)).toEqual(Buffer.from("photo"));
      expect(destroyBody).toHaveBeenCalledOnce();
      expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
      const outcome = await storage.putObjectIfAbsent({
        key: "cover.webp",
        bytes: Buffer.from("variant"),
        contentType: "image/webp",
      });
      expect(outcome).toBe("exists");
      expect(send.mock.calls[1][0]).toBeInstanceOf(PutObjectCommand);
      expect((send.mock.calls[1][0] as PutObjectCommand).input).toMatchObject({
        Bucket: "photos",
        Key: "cover.webp",
        IfNoneMatch: "*",
      });
    } finally {
      storage.destroy();
    }
  });

  it("destroys both clients through the API lifecycle hook", () => {
    const destroy = vi.spyOn(S3Client.prototype, "destroy");
    new ObjectStorage(configuration).onModuleDestroy();
    expect(destroy).toHaveBeenCalledTimes(2);
  });
});
