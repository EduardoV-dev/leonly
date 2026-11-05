import { PrismaConnection } from "@leonly/database";
import { PrismaClient } from "@leonly/database/client";
import { ENVIRONMENT_VARIABLES } from "../constants/environment-variables";

export const prisma = new PrismaClient({
  adapter: PrismaConnection.createAdapter({
    connectionString: ENVIRONMENT_VARIABLES.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 5_000,
    query_timeout: 10_000,
  }),
});
