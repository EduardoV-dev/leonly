import { describe, expect, it } from "vitest";
import { serializeError } from "./serialize-error";

describe("serializeError", () => {
  it("preserves error details while redacting sensitive fields and text", () => {
    const error = Object.assign(new Error("Failed for user@example.com"), {
      cause: new Error("Authorization: Bearer abc.def.ghi"),
      databaseUrl: "postgres://db-user:db-secret@localhost/leonly",
      code: "ECONNRESET",
      context: { invite_code: "LNY-SECRET", password: "secret-password" },
    });

    const serialized = JSON.stringify(serializeError(error));

    expect(serialized).toContain('"type":"Error"');
    expect(serialized).toContain('"code":"ECONNRESET"');
    expect(serialized).toContain('"stack":');
    expect(serialized).toContain('"cause":');
    expect(serialized).toContain('"invite_code":"[Redacted]"');
    expect(serialized).toContain('"password":"[Redacted]"');
    expect(serialized).toContain('"message":"Failed for [Redacted email]"');
    expect(serialized).not.toContain("LNY-SECRET");
    expect(serialized).not.toContain("secret-password");
    expect(serialized).not.toContain("abc.def.ghi");
    expect(serialized).not.toContain("db-secret");
    expect(serialized).not.toContain("user@example.com");
  });

  it("marks circular error properties instead of failing serialization", () => {
    const error = new Error("failure") as Error & { self?: Error };
    error.self = error;

    expect(serializeError(error)).toMatchObject({ self: "[Circular]" });
  });
});
