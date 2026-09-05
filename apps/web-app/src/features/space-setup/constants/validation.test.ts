import { describe, expect, it } from "vitest";
import { i18n } from "@/lib/i18n";
import {
  createJoinSpaceSetupSchema,
  formatInviteCodeDisplay,
  normalizeInviteCode,
} from "./validation";

const translation = i18n.getFixedT("en", "spaceSetup");

describe("invite code validation", () => {
  it.each([
    ["twofw3k3", "twofw3k3"],
    ["TWO-FW3K3", "twofw3k3"],
    [" \tTwo-fW3K3\r ", "twofw3k3"],
  ])("normalizes %s", (value, expected) => {
    expect(normalizeInviteCode(value)).toBe(expected);
  });

  it("formats normalized codes for display", () => {
    expect(formatInviteCodeDisplay("twofw3k3")).toBe("TWO-FW3K3");
  });

  it.each(["two-fw3k", "two--fw3k3", "abc-fw3k3", "two-fi3k3", "twofw3k0"])(
    "rejects malformed code %s",
    (inviteCode) => {
      const schema = createJoinSpaceSetupSchema(translation);

      expect(schema.safeParse({ displayName: "Leo", inviteCode }).success).toBe(false);
    },
  );

  it("accepts formatted codes with surrounding ASCII whitespace", () => {
    const schema = createJoinSpaceSetupSchema(translation);

    expect(schema.parse({ displayName: "Leo", inviteCode: "  TWO-FW3K3\t" }).inviteCode).toBe(
      "TWO-FW3K3",
    );
  });
});
