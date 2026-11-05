import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { validateOriginal } from "./image-recipe";

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
});
