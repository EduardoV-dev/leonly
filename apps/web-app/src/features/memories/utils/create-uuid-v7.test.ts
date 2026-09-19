import { afterEach, describe, expect, it, vi } from "vitest";
import { createUuidV7 } from "./create-uuid-v7";

describe("createUuidV7", () => {
  afterEach(() => vi.restoreAllMocks());

  it("encodes the timestamp and UUIDv7 variant bits", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("5b30857f-0bfa-48b5-ac0b-5c64e28078d1");

    expect(createUuidV7(1_740_350_784_503)).toBe("019534fd-83f7-78b5-ac0b-5c64e28078d1");
  });

  it("rejects timestamps outside the UUIDv7 range", () => {
    expect(() => createUuidV7(-1)).toThrow("UUIDv7 timestamp is outside the supported range.");
  });
});
