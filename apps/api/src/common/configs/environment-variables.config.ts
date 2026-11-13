import { parseSqsQueuesUrls } from "@leonly/utils/queue";

const NODE_ENVIRONMENT = process.env.NODE_ENV || "";

export const ENVIRONMENT_VARIABLES = Object.freeze({
  AWS_REGION: process.env.AWS_REGION || "",
  BETTER_AUTH_COOKIE_DOMAIN: process.env.BETTER_AUTH_COOKIE_DOMAIN || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  ENVIRONMENT: process.env.ENVIRONMENT || NODE_ENVIRONMENT || "local",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  NODE_ENV: NODE_ENVIRONMENT,
  PORT: process.env.PORT ?? "3001",
  SQS_ENDPOINT: process.env.SQS_ENDPOINT || "",
  SQS_QUEUES_URLS: parseSqsQueuesUrls(process.env.SQS_QUEUES_URLS || ""),
  STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID || "",
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || "",
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || "",
  STORAGE_REGION: process.env.STORAGE_REGION || "",
  STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY || "",
  STORAGE_SIGNING_ENDPOINT: process.env.STORAGE_SIGNING_ENDPOINT || "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
  WEB_APP_ORIGIN: process.env.WEB_APP_ORIGIN || "",
});

export function getWebAppOrigin(): string {
  return ENVIRONMENT_VARIABLES.WEB_APP_ORIGIN.trim();
}
