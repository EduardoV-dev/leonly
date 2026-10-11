export const ENVIRONMENT_VARIABLES = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || "",
  STORAGE_REGION: process.env.STORAGE_REGION || "",
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || "",
  STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID || "",
  STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY || "",
});
