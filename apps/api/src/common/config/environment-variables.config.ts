export const ENVIRONMENT_VARIABLES = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  WEB_APP_ORIGINS: process.env.WEB_APP_ORIGINS || "",
});

export function getWebAppOrigins(): string[] {
  return ENVIRONMENT_VARIABLES.WEB_APP_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
