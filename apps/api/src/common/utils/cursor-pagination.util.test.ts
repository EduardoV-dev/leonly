import { commentCursorSchema, encodeCursor } from "@leonly/utils/contracts";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { createCursorPage, decodePaginationCursor } from "./cursor-pagination.util";

const payload = {
  id: "01900000-0000-7000-8000-000000000007",
  memoryId: "01900000-0000-7000-8000-000000000004",
  parentCommentId: null,
  createdAt: "2026-09-05T16:00:00.123456Z",
};

describe("decodePaginationCursor", () => {
  it("decodes valid cursors and treats an absent cursor as the first page", () => {
    const cursor = encodeCursor({ schema: commentCursorSchema, payload });
    expect(decodePaginationCursor({ schema: commentCursorSchema, cursor })).toEqual(payload);
    expect(decodePaginationCursor({ schema: commentCursorSchema, cursor: undefined })).toBeNull();
  });

  it("maps malformed cursors to a bad request", () => {
    expect(() => decodePaginationCursor({ schema: commentCursorSchema, cursor: "!" })).toThrow(
      BadRequestException,
    );
  });

  it("propagates unexpected schema errors", () => {
    const error = new Error("unexpected failure");
    const schema = commentCursorSchema.refine(() => {
      throw error;
    });
    const cursor = encodeCursor({ schema: commentCursorSchema, payload });
    expect(() => decodePaginationCursor({ schema, cursor })).toThrow(error);
  });
});

describe("createCursorPage", () => {
  it("does not encode a cursor for empty or exactly full final pages", () => {
    const encodeNextCursor = vi.fn(String);
    expect(createCursorPage({ rows: [], limit: 2, encodeNextCursor })).toEqual({
      data: [],
      nextCursor: null,
    });
    expect(createCursorPage({ rows: [1, 2], limit: 2, encodeNextCursor })).toEqual({
      data: [1, 2],
      nextCursor: null,
    });
    expect(encodeNextCursor).not.toHaveBeenCalled();
  });

  it("encodes the last returned row instead of the lookahead row", () => {
    expect(createCursorPage({ rows: [1, 2, 3], limit: 2, encodeNextCursor: String })).toEqual({
      data: [1, 2],
      nextCursor: "2",
    });
  });
});
