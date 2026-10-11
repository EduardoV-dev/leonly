import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

export function createPrismaConfig(databaseUrl?: string): ReturnType<typeof defineConfig> {
  return defineConfig({
    schema: resolve(__dirname, "prisma/schema.prisma"),
    migrations: { path: resolve(__dirname, "prisma/migrations") },
    datasource: { url: databaseUrl },
  });
}
