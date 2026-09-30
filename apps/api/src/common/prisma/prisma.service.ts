import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "../../generated/prisma/client";
import { ENVIRONMENT_VARIABLES } from "../config/environment-variables.config";

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions & { log: { emit: "event"; level: "query" }[] }>
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = ENVIRONMENT_VARIABLES.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }

    const isDevelopment = ENVIRONMENT_VARIABLES.NODE_ENV === "development";
    super({
      adapter: new PrismaPg({ connectionString }),
      log: isDevelopment ? [{ emit: "event", level: "query" }] : [],
    });

    if (isDevelopment) {
      const logger = new Logger(PrismaService.name);
      this.$on("query", ({ query, duration }) => {
        logger.debug({ query, durationMs: duration }, "prisma_query");
      });
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
