import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creationRequest } from "./creation-fixtures";
import { hashCreation, normalizeCreation } from "./creation-validation";

describe("canonical creation contract", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T00:30:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("normalizes optional text, line endings and UUID case but excludes the idempotency key from hashing", () => {
    const request = { ...creationRequest(), title: "  First\r\nSecond  " };
    const first = normalizeCreation(request);
    const second = normalizeCreation({
      ...request,
      title: "First\nSecond",
      description: " ",
      location: null,
      idempotencyKey: randomUUID(),
    });
    expect(first.title).toBe("First\nSecond");
    expect(hashCreation(first)).toBe(hashCreation(second));
    const id = randomUUID();
    expect(
      normalizeCreation({ ...request, uploadIds: [id.toUpperCase()], coverUploadId: id }).uploadIds,
    ).toEqual([id]);
  });

  it("uses today in the supplied timezone rather than the server timezone", () => {
    const request = { ...creationRequest(), memoryDate: "2026-10-11" };
    expect(() => normalizeCreation(request)).not.toThrow();
    expect(() => normalizeCreation({ ...request, timezone: "America/Los_Angeles" })).toThrow();
  });

  it.each([
    { title: " " },
    { title: 5 },
    { title: "a".repeat(121) },
    { description: "a".repeat(2001) },
    { location: "a".repeat(151) },
    { memoryDate: "2026-02-30" },
    { memoryDate: "2026-1-1" },
    { memoryDate: "2026-10-12" },
    { timezone: "Invalid/Zone" },
    { visibility: "public" },
    { uploadIds: ["not-a-uuid"] },
    { uploadIds: Array.from({ length: 11 }, () => randomUUID()) },
    { uploadIds: ["01900000-0000-7000-8000-000000000001", "01900000-0000-7000-8000-000000000001"] },
    { coverUploadId: randomUUID() },
    { idempotencyKey: "key" },
    { createdByUserId: "forged" },
    { spaceId: randomUUID() },
    { originalKey: "forged" },
  ])("rejects invalid fields and forged authority: %j", (change) => {
    expect(() => normalizeCreation({ ...creationRequest(), ...change })).toThrow();
  });
});
