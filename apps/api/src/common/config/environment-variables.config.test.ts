import { afterEach, describe, expect, it, vi } from "vitest";

const ENVIRONMENT_VARIABLE_NAMES = [
  "NODE_ENV",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_COOKIE_DOMAIN",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "DATABASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "WEB_APP_ORIGIN",
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
      BETTER_AUTH_COOKIE_DOMAIN: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      DATABASE_URL: "",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      WEB_APP_ORIGIN: "",
    });
  });

  it("captures the runtime environment at module initialization", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { ENVIRONMENT_VARIABLES } = await import("./environment-variables.config");

    expect(ENVIRONMENT_VARIABLES.NODE_ENV).toBe("production");
    vi.stubEnv("NODE_ENV", "development");
    expect(ENVIRONMENT_VARIABLES.NODE_ENV).toBe("production");
  });

  it("trims the configured web app origin", async () => {
    vi.stubEnv("WEB_APP_ORIGIN", " https://app.example.com ");

    const { getWebAppOrigin } = await import("./environment-variables.config");

    expect(getWebAppOrigin()).toBe("https://app.example.com");
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
