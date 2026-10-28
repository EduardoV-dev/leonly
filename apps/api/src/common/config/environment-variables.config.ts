import { parseSqsQueuesUrls } from "@leonly/utils/queue";

export const ENVIRONMENT_VARIABLES = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  BETTER_AUTH_COOKIE_DOMAIN: process.env.BETTER_AUTH_COOKIE_DOMAIN || "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  WEB_APP_ORIGIN: process.env.WEB_APP_ORIGIN || "",
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || "",
  STORAGE_SIGNING_ENDPOINT: process.env.STORAGE_SIGNING_ENDPOINT || "",
  STORAGE_REGION: process.env.STORAGE_REGION || "",
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || "",
  STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID || "",
  STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY || "",
  SQS_QUEUES_URLS: parseSqsQueuesUrls(process.env.SQS_QUEUES_URLS || ""),
  SQS_ENDPOINT: process.env.SQS_ENDPOINT || "",
  AWS_REGION: process.env.AWS_REGION || "",
});

export function getWebAppOrigin(): string {
  return ENVIRONMENT_VARIABLES.WEB_APP_ORIGIN.trim();
}
