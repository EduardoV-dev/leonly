import { describe, expect, it } from "vitest";
import { z } from "zod";
import { decodeCursor, encodeCursor, InvalidCursorError } from "./cursor";
import { memoryCursorSchema } from "./memories/memory-list";

const cursor = {
  createdAt: "2026-10-01T12:30:00.123456Z",
  id: "01900000-0000-7000-8000-000000000004",
  memoryDate: "2026-10-01",
  sort: "newest" as const,
};

describe("memory cursors", () => {
  it("uses the base schema when no schema is supplied", () => {
    const payload = { createdAt: cursor.createdAt, id: cursor.id };
    expect(decodeCursor({ cursor: encodeCursor({ payload }) })).toEqual(payload);
  });

  it.each(["0000-01-01T00:00:00Z", "2026-10-01T12:30:00+16:00", "2026-10-01T12:30:00-16:00"])(
    "rejects PostgreSQL-incompatible base cursor timestamps: %s",
    (createdAt) => {
      const payload = { createdAt, id: cursor.id };
      const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
      expect(() => decodeCursor({ cursor: encoded })).toThrow(InvalidCursorError);
      expect(() => encodeCursor({ payload })).toThrow(z.ZodError);
    },
  );

  it.each(["2026-10-01T12:30:00Z", "2026-10-01T12:30:00+15:59", "2026-10-01T12:30:00-15:59"])(
    "accepts PostgreSQL-compatible base cursor timestamps: %s",
    (createdAt) => {
      const payload = { createdAt, id: cursor.id };
      expect(decodeCursor({ cursor: encodeCursor({ payload }) })).toEqual(payload);
    },
  );

  it("round trips both sorts without losing microseconds", () => {
    for (const sort of ["newest", "oldest"] as const) {
      const payload = { ...cursor, sort };
      const encoded = encodeCursor({ schema: memoryCursorSchema, payload });
      expect(decodeCursor({ schema: memoryCursorSchema, cursor: encoded })).toEqual(payload);
    }
  });

  it.each([
    "",
    "a".repeat(2049),
    "a=",
    "a",
    Buffer.from("not json").toString("base64url"),
    ...[
      { ...cursor, v: 1 },
      { ...cursor, sort: "other" },
      { ...cursor, memoryDate: "invalid" },
      { ...cursor, memoryDate: "0000-01-01" },
      { ...cursor, createdAt: "invalid" },
      { ...cursor, createdAt: "0000-01-01T00:00:00Z" },
      { ...cursor, createdAt: "2026-10-01T12:30:00+23:59" },
      { ...cursor, id: "invalid" },
      { ...cursor, extra: true },
      { ...cursor, id: undefined },
    ].map((payload) => Buffer.from(JSON.stringify(payload)).toString("base64url")),
  ])("rejects invalid client cursor %s", (encoded) => {
    expect(() => decodeCursor({ schema: memoryCursorSchema, cursor: encoded })).toThrow(
      InvalidCursorError,
    );
  });

  it("accepts PostgreSQL-compatible timezone offsets", () => {
    const payload = { ...cursor, createdAt: "2026-10-01T12:30:00+15:59" };
    expect(
      decodeCursor({
        schema: memoryCursorSchema,
        cursor: encodeCursor({ schema: memoryCursorSchema, payload }),
      }),
    ).toEqual(payload);
  });

  it("does not classify invalid server payloads or unexpected schema errors as client errors", () => {
    expect(() => encodeCursor({ schema: z.string(), payload: 42 as never })).toThrow(z.ZodError);
    const brokenSchema = z.string().transform(() => {
      throw new Error("unexpected");
    });
    const encoded = Buffer.from(JSON.stringify("value")).toString("base64url");
    expect(() => decodeCursor({ schema: brokenSchema, cursor: encoded })).toThrow("unexpected");
  });
});
