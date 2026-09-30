import { describe, expect, it } from "vitest";
import {
  formatInviteCodeDisplay,
  formatInviteCodeInput,
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_PREFIXES,
  isValidInviteCode,
  normalizeInviteCode,
} from "./invite-code";

describe("invite codes", () => {
  it.each(["lny7kmp2", "LNY-7KMP2", " \tLnY-7kMp2\r\n ", "\u00a0LNY-7KMP2\u00a0"])(
    "accepts and formats %s without losing characters",
    (value) => {
      expect(isValidInviteCode(value)).toBe(true);
      expect(normalizeInviteCode(value)).toBe("lny7kmp2");
      expect(formatInviteCodeInput(value)).toBe("LNY-7KMP2");
      expect(formatInviteCodeDisplay(value)).toBe("LNY-7KMP2");
    },
  );

  it.each([
    "",
    "   ",
    "abc7kmp2",
    "lny7kmp",
    "lny7kmp22",
    "lny--7kmp2",
    "lny7-kmp2",
    "lny-7k mp2",
    ...["i", "l", "o", "0", "1"].map((character) => `lny7kmp${character}`),
  ])("rejects malformed code %s", (value) => {
    expect(isValidInviteCode(value)).toBe(false);
  });

  it("does not repair malformed separators during normalization", () => {
    expect(normalizeInviteCode(" LNY--7KMP2 ")).toBe("lny--7kmp2");
    expect(normalizeInviteCode(" LNY7-KMP2 ")).toBe("lny7-kmp2");
  });

  it.each([
    ["l", "L"],
    ["lny", "LNY"],
    ["lny7", "LNY-7"],
    ["lny-7km", "LNY-7KM"],
    ["lny-7kmp22", "LNY-7KMP2"],
  ])("formats partially entered code %s", (value, expected) => {
    expect(formatInviteCodeInput(value)).toBe(expected);
  });

  it("accepts every generation prefix and every alphabet character in each suffix position", () => {
    for (const prefix of INVITE_PREFIXES) {
      for (let position = 0; position < INVITE_CODE_LENGTH; position += 1) {
        for (const character of INVITE_ALPHABET) {
          const suffix = Array.from({ length: INVITE_CODE_LENGTH }, () => "a");
          suffix[position] = character;
          const code = prefix + suffix.join("");
          const displayed = formatInviteCodeDisplay(code);

          expect(isValidInviteCode(code)).toBe(true);
          expect(isValidInviteCode(displayed)).toBe(true);
          expect(normalizeInviteCode(displayed)).toBe(code);
        }
      }
    }
  });
});
