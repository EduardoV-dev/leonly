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
  "STORAGE_ENDPOINT",
  "STORAGE_SIGNING_ENDPOINT",
  "STORAGE_REGION",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
  "SQS_QUEUES_URLS",
  "SQS_ENDPOINT",
  "AWS_REGION",
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
      STORAGE_ENDPOINT: "",
      STORAGE_SIGNING_ENDPOINT: "",
      STORAGE_REGION: "",
      STORAGE_BUCKET: "",
      STORAGE_ACCESS_KEY_ID: "",
      STORAGE_SECRET_ACCESS_KEY: "",
      SQS_QUEUES_URLS: {},
      SQS_ENDPOINT: "",
      AWS_REGION: "",
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
      ENVIRONMENT_VARIABLE_NAMES.map((name) => [
        name,
        name === "SQS_QUEUES_URLS"
          ? '{"memories":"https://sqs.example.com/memories"}'
          : `configured-${name}`,
      ]),
    ) as Record<(typeof ENVIRONMENT_VARIABLE_NAMES)[number], string>;

    for (const [name, value] of Object.entries(configuredValues)) {
      vi.stubEnv(name, value);
    }

    const { ENVIRONMENT_VARIABLES } = await import("./environment-variables.config");

    expect(ENVIRONMENT_VARIABLES).toEqual({
      ...configuredValues,
      SQS_QUEUES_URLS: JSON.parse(configuredValues.SQS_QUEUES_URLS),
    });
    expect(Object.isFrozen(ENVIRONMENT_VARIABLES)).toBe(true);
  });

  it("parses kebab-case queue URLs", async () => {
    vi.stubEnv(
      "SQS_QUEUES_URLS",
      '{"memories":"https://sqs.example.com/memories","email-notifications":"https://sqs.example.com/email"}',
    );

    const { ENVIRONMENT_VARIABLES } = await import("./environment-variables.config");

    expect(ENVIRONMENT_VARIABLES.SQS_QUEUES_URLS).toEqual({
      memories: "https://sqs.example.com/memories",
      "email-notifications": "https://sqs.example.com/email",
    });
  });

  it("rejects queue names that are not kebab-case", async () => {
    vi.stubEnv("SQS_QUEUES_URLS", '{"emailNotifications":"https://sqs.example.com/email"}');

    await expect(import("./environment-variables.config")).rejects.toThrow(
      'SQS_QUEUES_URLS key "emailNotifications" must use kebab-case',
    );
  });
});
