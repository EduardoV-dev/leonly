import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { commentBodySchema, createCommentInputSchema } from "./comment-input-validation";

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";

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
        memoryId,
        spaceId: memoryId,
      }).success,
    ).toBe(false);
  });
});
