import { PrismaConnection } from "@leonly/database";
import { PrismaClient } from "@leonly/database/client";
import { ObjectStorage } from "@leonly/utils/storage";
import { ENVIRONMENT_VARIABLES } from "./constants/environment-variables";

export { logger } from "./utils/logger";

export const prisma = new PrismaClient({
  adapter: PrismaConnection.createAdapter({
    connectionString: ENVIRONMENT_VARIABLES.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 5_000,
    query_timeout: 10_000,
  }),
});

export const storage = new ObjectStorage({
  endpoint: ENVIRONMENT_VARIABLES.STORAGE_ENDPOINT,
  region: ENVIRONMENT_VARIABLES.STORAGE_REGION,
  bucket: ENVIRONMENT_VARIABLES.STORAGE_BUCKET,
  accessKeyId: ENVIRONMENT_VARIABLES.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: ENVIRONMENT_VARIABLES.STORAGE_SECRET_ACCESS_KEY,
});
