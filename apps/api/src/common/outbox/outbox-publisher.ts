import type { Prisma } from "@leonly/database/client";
import {
  createSqsClient,
  publishMessage,
  type SQSClient,
  validateSqsUrl,
} from "@leonly/utils/queue";
import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export const MAX_REPLAY_EVENTS = 100;
export const OUTBOX_CONFIGURATION = Symbol("OUTBOX_CONFIGURATION");
const PUBLICATION_BUDGET_MS = 3_000;

export type PublicationOutcome = {
  id: string;
  status: "published" | "failed" | "uncertain" | "deferred";
};

export type OutboxEnvelope = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  schemaVersion: number;
  createdAt: string;
  payload: Prisma.JsonValue;
};

export type OutboxRoute = {
  queueUrl: string;
  validate: (envelope: OutboxEnvelope) => unknown;
};

export type OutboxConfiguration = {
  routes: Readonly<Record<string, OutboxRoute>>;
  region: string;
  endpoint?: string;
};

@Injectable()
export class OutboxPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);
  private readonly client: SQSClient;

  constructor(
    @Inject(PrismaService) private readonly prismaService: Pick<PrismaService, "$transaction">,
    @Inject(OUTBOX_CONFIGURATION) private readonly config: OutboxConfiguration,
  ) {
    const routes = Object.values(config.routes);
    if (!config.region || routes.length === 0 || routes.some(({ queueUrl }) => !queueUrl)) {
      throw new Error("Outbox queue routes and AWS region are required");
    }

    for (const { queueUrl } of routes) validateSqsUrl(queueUrl);
    this.client = createSqsClient({
      region: config.region,
      endpoint: config.endpoint || undefined,
    });
  }

  async publish(options: { ids?: string[]; limit: number }): Promise<PublicationOutcome[]> {
    if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > MAX_REPLAY_EVENTS)
      throw new Error(`Publication limit must be between 1 and ${MAX_REPLAY_EVENTS}`);

    if (options.ids && (options.ids.length === 0 || options.ids.length > MAX_REPLAY_EVENTS))
      throw new Error("Publication IDs must be a bounded nonempty selection");

    const abortSignal = AbortSignal.timeout(PUBLICATION_BUDGET_MS);
    const events = await this.runBookkeeping((transaction) =>
      transaction.outboxEvent.findMany({
        where: { publishedAt: null, ...(options.ids ? { id: { in: options.ids } } : {}) },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: options.limit,
      }),
    );

    const outcomes: PublicationOutcome[] = [];

    for (const event of events) {
      if (abortSignal.aborted) {
        outcomes.push({ id: event.id, status: "deferred" });
        continue;
      }

      let hasAcknowledgment = false;
      let code = "PUBLICATION_ROUTE_MISSING";

      try {
        const hasRoute = Object.hasOwn(this.config.routes, event.eventType);

        if (!hasRoute) throw new Error("No outbox route for event type");

        const route = this.config.routes[event.eventType];
        const envelope: OutboxEnvelope = {
          id: event.id,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          createdAt: event.createdAt.toISOString(),
          payload: event.payload,
        };

        code = "PUBLICATION_VALIDATION_FAILED";
        route.validate(envelope);
        code = "PUBLICATION_SEND_FAILED";

        await publishMessage({
          client: this.client,
          queueUrl: route.queueUrl,
          payload: envelope,
          abortSignal,
        });

        hasAcknowledgment = true;
        code = "PUBLICATION_BOOKKEEPING_FAILED";

        await this.runBookkeeping((transaction) =>
          transaction.outboxEvent.updateMany({
            where: { id: event.id, publishedAt: null },
            data: {
              publishedAt: new Date(),
              publicationAttempts: { increment: 1 },
              lastPublicationError: null,
            },
          }),
        );

        outcomes.push({ id: event.id, status: "published" });
      } catch {
        this.logger.warn({ event: "outbox_publication_failed", eventId: event.id, code });

        try {
          await this.runBookkeeping((transaction) =>
            transaction.outboxEvent.updateMany({
              where: { id: event.id, publishedAt: null },
              data: { publicationAttempts: { increment: 1 }, lastPublicationError: code },
            }),
          );
        } catch {
          this.logger.error({ event: "outbox_bookkeeping_failed", eventId: event.id, code });
        }

        outcomes.push({ id: event.id, status: hasAcknowledgment ? "uncertain" : "failed" });
      }
    }

    return outcomes;
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  private async runBookkeeping<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prismaService.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`SET LOCAL statement_timeout = '1000ms'`;
        return operation(transaction);
      },
      { maxWait: 1_000, timeout: 1_500 },
    );
  }
}
