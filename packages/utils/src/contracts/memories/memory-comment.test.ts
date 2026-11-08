import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, InvalidCursorError } from "../cursor";
import { commentCursorSchema } from "./memory-comment";

describe("comment cursor", () => {
  const payload = {
    createdAt: "2026-09-05T16:00:00.123456Z",
    id: "01900000-0000-7000-8000-000000000004",
    memoryId: "01900000-0000-7000-8000-000000000005",
    parentCommentId: null,
  };

  it("preserves the complete timestamp and scope", () => {
    const cursor = encodeCursor({ schema: commentCursorSchema, payload });
    expect(decodeCursor({ schema: commentCursorSchema, cursor })).toEqual(payload);
  });

  it("rejects malformed cursors and imprecise timestamps", () => {
    expect(() => decodeCursor({ schema: commentCursorSchema, cursor: "!" })).toThrow(
      InvalidCursorError,
    );
    expect(
      commentCursorSchema.safeParse({ ...payload, createdAt: "2026-09-05T16:00:00.123Z" }).success,
    ).toBe(false);
  });
});
