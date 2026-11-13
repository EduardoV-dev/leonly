import { ObjectSizeError } from "@leonly/utils/storage";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { generateVariant, validateOriginal } from "./image-recipe";
import { normalizeProcessingError } from "./processing-failures";

describe("untrusted original decoding", () => {
  it("rejects images above the 40-million-pixel limit before generation", async () => {
    const bytes = await sharp({
      create: { width: 6400, height: 6400, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    await expect(
      validateOriginal(bytes, { mimeType: "image/png", byteSize: bytes.length }),
    ).rejects.toThrow("INVALID_ORIGINAL");
  });

  it("fully decodes pixels instead of accepting a readable header", async () => {
    const bytes = await sharp({ create: { width: 20, height: 20, channels: 3, background: "red" } })
      .png()
      .toBuffer();
    const truncated = bytes.subarray(0, 50);
    await expect(
      validateOriginal(truncated, { mimeType: "image/png", byteSize: truncated.length }),
    ).rejects.toThrow("INVALID_ORIGINAL");
  });

  it("preserves the decoder error as the cause of the translated failure", async () => {
    const error = await validateOriginal(Buffer.from("not an image"), {
      mimeType: "image/png",
      byteSize: 12,
    }).catch((caught: Error) => caught);

    expect((error as { code?: string }).code).toBe("INVALID_ORIGINAL");
    expect((error as { cause?: unknown }).cause).toBeInstanceOf(Error);
  });

  it("preserves the cause when translating size-limit and variant errors", async () => {
    const sizeError = normalizeProcessingError(new ObjectSizeError("Object is over the limit"));
    expect((sizeError as Error).message).toBe("IMAGE_SIZE_LIMIT_EXCEEDED");
    expect((sizeError as Error).cause).toBeInstanceOf(ObjectSizeError);

    const variantError = await generateVariant(Buffer.from("not an image"), "cover").catch(
      (caught: Error) => caught,
    );
    expect((variantError as { code?: string }).code).toBe("INVALID_ORIGINAL");
    expect((variantError as { cause?: unknown }).cause).toBeInstanceOf(Error);
  });
});
