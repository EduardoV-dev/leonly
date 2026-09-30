import { afterEach, describe, expect, it, vi } from "vitest";

const ENVIRONMENT_VARIABLE_NAMES = [
  "NODE_ENV",
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "DATABASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "WEB_APP_ORIGINS",
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("ENVIRONMENT_VARIABLES", () => {
  it("defaults missing values to empty strings", async () => {
    for (const name of ENVIRONMENT_VARIABLE_NAMES) {
      vi.stubEnv(name, "");
    }

    const { ENVIRONMENT_VARIABLES } = await import("./environment-variables.config");

    expect(ENVIRONMENT_VARIABLES).toEqual({
      NODE_ENV: "",
      BETTER_AUTH_SECRET: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      DATABASE_URL: "",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      WEB_APP_ORIGINS: "",
    });
  });

  it("captures the runtime environment at module initialization", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { ENVIRONMENT_VARIABLES } = await import("./environment-variables.config");

    expect(ENVIRONMENT_VARIABLES.NODE_ENV).toBe("production");
    vi.stubEnv("NODE_ENV", "development");
    expect(ENVIRONMENT_VARIABLES.NODE_ENV).toBe("production");
  });

  it("parses configured web app origins", async () => {
    vi.stubEnv("WEB_APP_ORIGINS", " https://app.example.com, https://admin.example.com ");

    const { getWebAppOrigins } = await import("./environment-variables.config");

    expect(getWebAppOrigins()).toEqual(["https://app.example.com", "https://admin.example.com"]);
  });

  it("passes configured values through unchanged", async () => {
    const configuredValues = Object.fromEntries(
      ENVIRONMENT_VARIABLE_NAMES.map((name) => [name, `configured-${name}`]),
    ) as Record<(typeof ENVIRONMENT_VARIABLE_NAMES)[number], string>;

    for (const [name, value] of Object.entries(configuredValues)) {
      vi.stubEnv(name, value);
    }

    const { ENVIRONMENT_VARIABLES } = await import("./environment-variables.config");

    expect(ENVIRONMENT_VARIABLES).toEqual(configuredValues);
    expect(Object.isFrozen(ENVIRONMENT_VARIABLES)).toBe(true);
  });
});
