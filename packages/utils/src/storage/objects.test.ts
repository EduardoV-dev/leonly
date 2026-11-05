import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
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
  it("signs a specific object GET for the configured duration", async () => {
    const secretAccessKey = "example-secret-key";
    const storage = new ObjectStorage({ ...configuration, secretAccessKey });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T00:00:00Z"));
    try {
      const url = new URL(await storage.signObject({ key: "memories/cover.webp", expiresIn: 120 }));
      const otherUrl = new URL(
        await storage.signObject({ key: "memories/other.webp", expiresIn: 120 }),
      );
      vi.setSystemTime(new Date("2026-10-11T00:01:00Z"));
      const renewedUrl = new URL(
        await storage.signObject({ key: "memories/cover.webp", expiresIn: 120 }),
      );
      expect(url.origin).toBe(configuration.signingEndpoint);
      expect(url.pathname).toBe("/photos/memories/cover.webp");
      expect(url.searchParams.get("X-Amz-Expires")).toBe("120");
      expect(url.searchParams.get("X-Amz-Date")).toBe("20261011T000000Z");
      expect(renewedUrl.searchParams.get("X-Amz-Date")).toBe("20261011T000100Z");
      expect(renewedUrl.searchParams.get("X-Amz-Expires")).toBe("120");
      expect(url.searchParams.get("X-Amz-Signature")).not.toBe(
        otherUrl.searchParams.get("X-Amz-Signature"),
      );
      expect(url.toString()).not.toContain(secretAccessKey);
    } finally {
      vi.useRealTimers();
      storage.destroy();
    }
  });

  it("reads metadata with HEAD and distinguishes missing objects from storage failures", async () => {
    const send = vi.spyOn(S3Client.prototype, "send");
    send.mockResolvedValueOnce({ ContentLength: 123, ContentType: "image/png" } as never);
    send.mockRejectedValueOnce({ name: "NotFound", $metadata: { httpStatusCode: 404 } });
    send.mockRejectedValueOnce(new Error("Access denied"));
    const storage = new ObjectStorage(configuration);
    try {
      await expect(storage.headObject("original")).resolves.toEqual({
        byteSize: 123,
        contentType: "image/png",
      });
      expect(send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand);
      expect((send.mock.calls[0][0] as HeadObjectCommand).input).toEqual({
        Bucket: "photos",
        Key: "original",
      });
      await expect(storage.headObject("missing")).resolves.toBeNull();
      await expect(storage.headObject("protected")).rejects.toThrow("Access denied");
    } finally {
      storage.destroy();
    }
  });
  it("signs browser uploads against the public endpoint with the required content type", async () => {
    const storage = new ObjectStorage(configuration);
    try {
      const url = new URL(
        await storage.signUpload({
          key: "memories/photo.png",
          contentType: "image/png",
          byteSize: 1024,
          issuedAt: new Date("2026-10-11T00:00:00Z"),
        }),
      );
      expect(url.origin).toBe(configuration.signingEndpoint);
      expect(url.pathname).toBe("/photos/memories/photo.png");
      expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
      expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
      expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-length");
      expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("if-none-match");
      const differentSizeUrl = new URL(
        await storage.signUpload({
          key: "memories/photo.png",
          contentType: "image/png",
          byteSize: 1025,
          issuedAt: new Date("2026-10-11T00:00:00Z"),
        }),
      );

      expect(url.searchParams.get("X-Amz-Signature")).not.toBe(
        differentSizeUrl.searchParams.get("X-Amz-Signature"),
      );
    } finally {
      storage.destroy();
    }
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "refuses invalid upload byte size %s before issuing a capability",
    async (byteSize) => {
      const storage = new ObjectStorage(configuration);

      try {
        await expect(
          storage.signUpload({
            key: "memories/photo.png",
            contentType: "image/png",
            byteSize,
            issuedAt: new Date("2026-10-11T00:00:00Z"),
          }),
        ).rejects.toThrow("Upload byte size must be a positive safe integer");
      } finally {
        storage.destroy();
      }
    },
  );

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
      expect(await storage.getObject({ key: "original", maxBytes: 5 })).toEqual(
        Buffer.from("photo"),
      );
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

  it("uses the configured bucket for reads and writes", async () => {
    const send = vi.spyOn(S3Client.prototype, "send");
    send.mockRejectedValueOnce({ name: "NoSuchKey", $metadata: { httpStatusCode: 404 } });
    send.mockResolvedValue({} as never);
    const storage = new ObjectStorage(configuration);

    try {
      await storage.getObject({ key: "same-key", maxBytes: 5 });
      await storage.putObjectIfAbsent({
        key: "same-key",
        bytes: Buffer.from("photo"),
        contentType: "image/png",
      });
      expect((send.mock.calls[0][0] as GetObjectCommand).input).toEqual({
        Bucket: "photos",
        Key: "same-key",
      });
      expect((send.mock.calls[1][0] as PutObjectCommand).input).toMatchObject({
        Bucket: "photos",
        Key: "same-key",
        IfNoneMatch: "*",
      });
    } finally {
      storage.destroy();
    }
  });

  it("treats missing keys as absent and propagates other read failures", async () => {
    const send = vi.spyOn(S3Client.prototype, "send");
    send
      .mockRejectedValueOnce({ name: "NoSuchKey", $metadata: { httpStatusCode: 404 } })
      .mockRejectedValueOnce(new Error("Access denied"))
      .mockRejectedValueOnce({ name: "NoSuchBucket", $metadata: { httpStatusCode: 404 } });
    const storage = new ObjectStorage(configuration);

    try {
      await expect(storage.getObject({ key: "missing", maxBytes: 5 })).resolves.toBeNull();
      await expect(storage.getObject({ key: "protected", maxBytes: 5 })).rejects.toThrow(
        "Access denied",
      );
      await expect(storage.getObject({ key: "missing-bucket", maxBytes: 5 })).rejects.toMatchObject(
        {
          name: "NoSuchBucket",
        },
      );
      expect(send.mock.calls.map(([command]) => (command as GetObjectCommand).input)).toEqual([
        { Bucket: "photos", Key: "missing" },
        { Bucket: "photos", Key: "protected" },
        { Bucket: "photos", Key: "missing-bucket" },
      ]);
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
