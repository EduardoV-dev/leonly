import { createPrismaConfig } from "./prisma-config";

export default createPrismaConfig(process.env.DATABASE_URL);
