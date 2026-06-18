import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
  createCreateSpaceSetupSchema,
  createJoinSpaceSetupSchema,
  getTrimmedLength,
  isFutureDateString,
  isValidInviteCode,
  normalizeInviteCode,
} from "./validation";

const t = ((key: string, options?: { count?: number }) =>
  options?.count ? `${key}:${options.count}` : key) as TFunction<"spaceSetup">;

describe("space setup validation", () => {
  it("counts trimmed characters", () => {
    expect(getTrimmedLength("  Leonly  ")).toBe(6);
  });

  it("normalizes invite codes", () => {
    expect(normalizeInviteCode(" lny-7kq9m2 ")).toBe("LNY-7KQ9M2");
  });

  it("validates invite code shape", () => {
    expect(isValidInviteCode("LNY-7KQ9M2")).toBe(true);
    expect(isValidInviteCode("lny-7kq9m2")).toBe(true);
    expect(isValidInviteCode("LNY7KQ9M2")).toBe(false);
    expect(isValidInviteCode("LN-7KQ9M2")).toBe(false);
    expect(isValidInviteCode("LNY-7KQ9M!")).toBe(false);
  });

  it("detects future date strings", () => {
    const nextYear = new Date().getFullYear() + 1;

    expect(isFutureDateString(`${nextYear}-01-01`)).toBe(true);
    expect(isFutureDateString("2000-01-01")).toBe(false);
    expect(isFutureDateString("")).toBe(false);
  });

  it("validates create setup values with zod", () => {
    const schema = createCreateSpaceSetupSchema(t);

    expect(
      schema.safeParse({
        displayName: "",
        spaceName: "Our Sanctuary",
        firstDay: "2020-01-01",
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        displayName: "Ana",
        spaceName: "Us",
        firstDay: `${new Date().getFullYear() + 1}-01-01`,
      }).success,
    ).toBe(false);
  });

  it("validates join setup values with zod", () => {
    const schema = createJoinSpaceSetupSchema(t);

    expect(
      schema.safeParse({
        inviteCode: "lny-7kq9m2",
        displayName: "",
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        inviteCode: "LNY7KQ9M2",
        displayName: "Ana",
      }).success,
    ).toBe(false);
  });
});
