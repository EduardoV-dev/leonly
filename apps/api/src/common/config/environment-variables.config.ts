export const ENVIRONMENT_VARIABLES = Object.freeze({
  APP_BASE_URL: process.env.APP_BASE_URL || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  WEB_APP_ORIGINS: process.env.WEB_APP_ORIGINS || "",
});

export function getWebAppOrigins(): string[] {
  return ENVIRONMENT_VARIABLES.WEB_APP_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
