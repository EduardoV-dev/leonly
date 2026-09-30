import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { JoinSpaceDto } from "./join-space.dto";

describe("JoinSpaceDto", () => {
  it("trims a provided display name", () => {
    const dto = plainToInstance(JoinSpaceDto, {
      invite_code: "LNY-7KMP2",
      display_name: " Partner ",
    });
    expect(dto.display_name).toBe("Partner");
  });

  it.each([null, undefined])("preserves an omitted optional name", (displayName) => {
    const dto = plainToInstance(JoinSpaceDto, {
      invite_code: "LNY-7KMP2",
      display_name: displayName,
    });
    expect(dto.display_name).toBe(displayName);
  });

  it("rejects a non-string name without coercing it", async () => {
    const dto = plainToInstance(JoinSpaceDto, { invite_code: "LNY-7KMP2", display_name: 42 });
    expect(await validate(dto)).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "display_name" })]),
    );
  });
});
