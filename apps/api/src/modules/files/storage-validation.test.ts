import {
  ObjectSizeError,
  readBoundedObject,
  validateStorageConfiguration,
} from "@leonly/utils/storage";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { validateFinalImage } from "./upload-validation";

describe("bounded immutable image validation", () => {
  it("fully decodes final pixels and rejects declaration mismatch and corrupt payloads", async () => {
    const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } })
      .png()
      .toBuffer();
    await expect(
      validateFinalImage({ bytes, declaredMimeType: "image/png", declaredByteSize: bytes.length }),
    ).resolves.toEqual({ mimeType: "image/png", byteSize: bytes.length });
    await expect(
      validateFinalImage({ bytes, declaredMimeType: "image/jpeg", declaredByteSize: bytes.length }),
    ).rejects.toThrow();
    await expect(
      validateFinalImage({
        bytes,
        declaredMimeType: "image/png",
        declaredByteSize: bytes.length + 1,
      }),
    ).rejects.toThrow();
    const corrupt = bytes.subarray(0, 50);
    await expect(
      validateFinalImage({
        bytes: corrupt,
        declaredMimeType: "image/png",
        declaredByteSize: corrupt.length,
      }),
    ).rejects.toThrow();
  });

  it("rejects images over the 40-million-pixel limit", async () => {
    const bytes = await sharp({
      create: { width: 6400, height: 6400, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    await expect(
      validateFinalImage({ bytes, declaredMimeType: "image/png", declaredByteSize: bytes.length }),
    ).rejects.toThrow();
  });

  it("bounds actual streaming bytes even when content length is missing or dishonest", async () => {
    const destroy = vi.fn();
    const body = {
      destroy,
      async *[Symbol.asyncIterator]() {
        yield Buffer.from("123");
        yield Buffer.from("456");
      },
    };
    await expect(readBoundedObject({ body, contentLength: 3, maxBytes: 5 })).rejects.toBeInstanceOf(
      ObjectSizeError,
    );
    expect(destroy).toHaveBeenCalledOnce();
    await expect(readBoundedObject({ body, maxBytes: 6 })).resolves.toEqual(Buffer.from("123456"));
  });

  it("fails fast on incomplete credentials or malformed endpoints", () => {
    const configuration = {
      endpoint: "http://localhost:4566",
      region: "us-east-1",
      bucket: "photos",
      accessKeyId: "local",
      secretAccessKey: "local",
    };
    expect(validateStorageConfiguration(configuration)).toEqual(configuration);
    expect(() => validateStorageConfiguration({ ...configuration, secretAccessKey: "" })).toThrow(
      "secretAccessKey is required",
    );
    expect(() =>
      validateStorageConfiguration({
        ...configuration,
        signingEndpoint: "http://localhost:4566/path",
      }),
    ).toThrow();
    expect(() =>
      validateStorageConfiguration({ ...configuration, endpoint: "file:///tmp/storage" }),
    ).toThrow();
  });

  it("aborts a stalled body instead of waiting beyond the storage deadline", async () => {
    const controller = new AbortController();
    const destroy = vi.fn();
    const body = {
      destroy,
      [Symbol.asyncIterator]() {
        return { next: () => new Promise<IteratorResult<Uint8Array>>(() => {}) };
      },
    };
    const read = readBoundedObject({ body, maxBytes: 10, signal: controller.signal });
    controller.abort();
    await expect(read).rejects.toThrow("timed out");
    expect(destroy).toHaveBeenCalledOnce();
  });
});
