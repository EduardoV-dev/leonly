import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  commentBodySchema,
  createCommentInputSchema,
  createCommentRequestFingerprint,
} from "./comment-input-validation";

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const idempotencyKey = "3ddf312a-e682-4cd8-91f9-9a2a230241ed";

describe("comment input validation", () => {
  it("trims valid text and preserves intentional internal line breaks", () => {
    expect(commentBodySchema.parse("  First line\nSecond line  ")).toBe("First line\nSecond line");
  });

  it.each([
    ["", "Enter a comment."],
    [" \n\t ", "Enter a comment."],
    ["😀".repeat(1001), "Comment must be 1,000 characters or fewer."],
  ])("rejects an invalid body (%j)", (body, message) => {
    expect(() => commentBodySchema.parse(body)).toThrow(message);
  });

  it("counts Unicode characters rather than UTF-16 code units", () => {
    expect(commentBodySchema.parse("😀".repeat(1000))).toHaveLength(2000);
  });

  it("keeps markup-like content as inert plain text", () => {
    const body = "<script>alert('not executable')</script>";
    expect(commentBodySchema.parse(body)).toBe(body);
  });

  it("rejects unknown request fields at the strict boundary", () => {
    expect(
      createCommentInputSchema.safeParse({
        body: "A note",
        idempotencyKey,
        memoryId,
        spaceId: memoryId,
      }).success,
    ).toBe(false);
  });

  it("fingerprints the normalized memory and plain-text body deterministically", () => {
    const fingerprint = createCommentRequestFingerprint(memoryId, "A note");
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).toBe(createCommentRequestFingerprint(memoryId, "A note"));
    expect(fingerprint).not.toBe(createCommentRequestFingerprint(memoryId, "Another note"));
  });
});
