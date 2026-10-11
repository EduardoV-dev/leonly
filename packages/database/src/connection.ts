import { PrismaPg } from "@prisma/adapter-pg";

export type DatabaseConfiguration = {
  connectionString: string;
  max?: number;
  connectionTimeoutMillis?: number;
  query_timeout?: number;
};

export class PrismaConnection {
  static createAdapter(configuration: DatabaseConfiguration): PrismaPg {
    if (!configuration.connectionString?.trim()) throw new Error("DATABASE_URL is required");
    return new PrismaPg(configuration);
  }
}
