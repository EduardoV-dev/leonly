import { describe, expect, it } from "vitest";
import { serializeError } from "./serialize-error";

const serializedJson = (error: unknown): string => JSON.stringify(serializeError(error));

describe("serializeError", () => {
  it("preserves safe error identity while redacting sensitive text and fields", () => {
    const error = Object.assign(new Error("Failed for user@example.com"), {
      cause: new Error("Authorization: Bearer abc.def.ghi"),
      code: "ECONNRESET",
      context: { invite_code: "LNY-SECRET", password: "secret-password" },
    });

    const serialized = serializedJson(error);

    expect(serialized).toContain('"type":"Error"');
    expect(serialized).toContain('"code":"ECONNRESET"');
    expect(serialized).toContain('"stack":');
    expect(serialized).toContain('"cause":');
    expect(serialized).toContain('"message":"Failed for [Redacted email]"');
    expect(serialized).toContain('"cause":{"type":"Error"');
    expect(serialized).not.toContain("LNY-SECRET");
    expect(serialized).not.toContain("secret-password");
    expect(serialized).not.toContain("abc.def.ghi");
    expect(serialized).not.toContain("user@example.com");
  });

  it("omits unapproved arbitrary error properties instead of trusting regex redaction", () => {
    const error = Object.assign(new Error("Provider rejected the request"), {
      databaseUrl: "postgres://db-user:db-secret@localhost/leonly",
      oauthCallbackUrl: "https://app.example.com/auth/callback?code=oauth-code-123&state=x#token",
      sessionObject: { sessionToken: "session-secret", user: { email: "user@example.com" } },
      attempts: 2,
      isRetryable: true,
    });

    const serialized = serializeError(error) as Record<string, unknown>;

    expect(serialized).toMatchObject({ attempts: 2, isRetryable: true });
    expect(serialized).not.toHaveProperty("databaseUrl");
    expect(serialized).not.toHaveProperty("oauthCallbackUrl");
    expect(serialized).not.toHaveProperty("sessionObject");
  });

  it("keeps approved style codes and nested causes while bounding the serialized size", () => {
    const deepest = Object.assign(new Error("root cause: token=private-token-value"), {
      code: "ECONNREFUSED",
    });
    const error = Object.assign(new Error("Request failed"), {
      code: "PROCESSING_BUSY",
      cause: Object.assign(new Error("Dependency failed"), {
        code: "HTTP_503",
        cause: Object.assign(new Error("Transport failed"), { cause: deepest }),
      }),
    });

    const serialized = serializeError(error) as Record<string, unknown>;
    const serializedText = JSON.stringify(serialized);

    expect(serialized.code).toBe("PROCESSING_BUSY");
    expect((serialized.cause as Record<string, unknown>).code).toBe("HTTP_503");
    expect(
      ((serialized.cause as Record<string, unknown>).cause as Record<string, unknown>).cause,
    ).toMatchObject({ code: "ECONNREFUSED" });
    expect(serializedText).toContain('"type":"Error"');
    expect(serializedText).not.toContain("private-token-value");
    expect(Buffer.byteLength(serializedText, "utf8")).toBeLessThanOrEqual(12_288);
  });

  it("marks cause chains deeper than four links as truncated", () => {
    const build = (depth: number): Error => {
      let error: Error = new Error("leaf");
      for (let index = 0; index < depth; index += 1) {
        error = Object.assign(new Error(`level-${index}`), { cause: error });
      }
      return error;
    };

    const serialized = serializedJson(build(6));

    expect((serialized.match(/"cause":\{/g) ?? []).length).toBe(4);
    expect(serialized).toContain('"[Truncated]"');
  });

  it("marks circular references instead of failing serialization", () => {
    const error = new Error("failure") as Error & { self?: Error };
    error.self = error;
    error.cause = error;

    const serialized = serializeError(error) as Record<string, unknown>;
    expect(serialized.cause).toBe("[Circular]");
    expect(serialized).not.toHaveProperty("self");

    const container: { self?: unknown } = {};
    container.self = container;
    expect(serializeError(container)).toMatchObject({ self: "[Circular]" });
  });

  it("never invokes getter-only hostile properties and omits their values", () => {
    const error = new Error("hostile getter");
    let getterCalls = 0;
    Object.defineProperty(error, "poisoned", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("getter must not run");
      },
    });

    expect(() => serializeError(error)).not.toThrow();
    expect(getterCalls).toBe(0);
    expect(serializeError(error)).not.toHaveProperty("poisoned");
  });

  it("sanitizes non-Error throws including hostile values without breaking", () => {
    expect(serializeError("Rejected for user@example.com")).toBe("Rejected for [Redacted email]");
    expect(serializeError(42)).toBe(42);
    expect(serializeError({ reason: "token=abc" })).toMatchObject({ reason: "token=[Redacted]" });
    expect(serializeError(Symbol.for("ignored"))).toBeUndefined();
    expect(serializeError(() => "ignored")).toBeUndefined();
    expect(serializeError({ toString: 1, payload: { nested: true } })).toMatchObject({
      payload: { nested: true },
    });
  });

  it("drops invalid dates instead of throwing", () => {
    const error = Object.assign(new Error("bad date"), { occurredAt: new Date("not-a-date") });

    expect(serializeError(error)).not.toHaveProperty("occurredAt");
  });

  it("bounds strings by encoded bytes including multibyte content", () => {
    const multibyte = "🚀".repeat(2_000);
    const serialized = serializeError({ detail: multibyte }) as Record<string, unknown>;

    expect(Buffer.byteLength(serialized.detail as string, "utf8")).toBeLessThanOrEqual(2_048);
    expect((serialized.detail as string).endsWith("[Truncated]")).toBe(true);
  });

  it("bounds stacks after stripping the message line", () => {
    const error = new Error("failure with user@example.com");
    error.stack = `${error.message}\n    at handler (/srv/app/handler.js:1:1)`;

    const serialized = serializeError(error) as Record<string, unknown>;

    expect(serialized.stack).toBe("at handler (/srv/app/handler.js:1:1)");
    expect(serialized.stack).not.toContain("user@example.com");
  });

  it("bounds collections and depth while preserving outcomes", () => {
    const value = {
      entries: Array.from({ length: 25 }, (_, index) => index),
      properties: Object.fromEntries(
        Array.from({ length: 35 }, (_, index) => [`key${index}`, index]),
      ),
      deep: { a: { b: { c: { d: { e: { f: { g: { h: 1 } } } } } } } },
    };

    const serialized = serializeError(value) as Record<string, unknown>;

    expect(serialized.entries).toEqual([
      ...Array.from({ length: 20 }, (_, index) => index),
      "[Truncated]",
    ]);
    expect((serialized.properties as Record<string, unknown>).truncatedProperties).toBe(
      "[Truncated]",
    );
    expect(JSON.stringify(serialized.deep)).toContain('"[Truncated]"');
  });

  it("marks oversized serialized error data as truncated while keeping identity", () => {
    const longStack = Array.from(
      { length: 60 },
      (_, index) => `    at frame${index} (/srv/app/f.js:1:1)`,
    ).join("\n");
    const withStack = (cause?: unknown, code?: string): Error => {
      const error = Object.assign(new Error("x".repeat(2_500)), {
        ...(cause ? { cause } : {}),
        ...(code ? { code } : {}),
      });
      error.stack = longStack;
      return error;
    };
    const error = withStack(withStack(withStack(withStack()), "ECONNRESET"), "PROCESSING_BUSY");

    const serialized = serializeError(error) as Record<string, unknown>;
    const serializedText = JSON.stringify(serialized);

    expect(Buffer.byteLength(serializedText, "utf8")).toBeLessThanOrEqual(12_288);
    expect(serialized.truncated).toBe(true);
    expect(serialized.type).toBe("Error");
    expect((serialized.message as string).startsWith("x")).toBe(true);
    expect(serialized.code).toBe("PROCESSING_BUSY");
    expect(serialized).not.toHaveProperty("stack");
    expect(serialized.cause).toBeDefined();
  });
});
