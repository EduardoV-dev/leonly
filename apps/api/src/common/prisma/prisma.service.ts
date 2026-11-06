import { PrismaConnection } from "@leonly/database";
import { type Prisma, PrismaClient } from "@leonly/database/client";
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ENVIRONMENT_VARIABLES } from "../configs/environment-variables.config";

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
      adapter: PrismaConnection.createAdapter({ connectionString }),
      log: isDevelopment ? [{ emit: "event", level: "query" }] : [],
    });

    if (isDevelopment) {
      const logger = new Logger(PrismaService.name);
      this.$on("query", ({ query, duration }) => {
        logger.debug(
          { durationMs: duration },
          `prisma_query\n--------------------\n${query}\n--------------------`,
        );
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
