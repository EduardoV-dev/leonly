import { resolve } from "node:path";
import { config } from "dotenv";
import { createPrismaConfig } from "../../packages/database/prisma-config";

config({ path: resolve(__dirname, ".env") });

export default createPrismaConfig(process.env.DATABASE_URL);
