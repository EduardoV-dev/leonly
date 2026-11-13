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
  entityType: string;
  entityId: string;
  eventType: string;
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

type PublishParams = { ids?: string[]; limit: number };

@Injectable()
export class OutboxPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);
  private readonly client: SQSClient;

  constructor(
    @Inject(PrismaService) private readonly prismaService: Pick<PrismaService, "$transaction">,
    @Inject(OUTBOX_CONFIGURATION) private readonly config: OutboxConfiguration,
  ) {
    const routes = Object.values(config.routes);
    const hasInvalidConfiguration =
      !config.region || routes.length === 0 || routes.some(({ queueUrl }) => !queueUrl);

    if (hasInvalidConfiguration) {
      throw new Error("Outbox queue routes and AWS region are required");
    }

    for (const { queueUrl } of routes) validateSqsUrl(queueUrl);
    this.client = createSqsClient({
      region: config.region,
      endpoint: config.endpoint || undefined,
    });
  }

  async publish({ ids, limit }: PublishParams): Promise<PublicationOutcome[]> {
    const hasInvalidLimit = !Number.isInteger(limit) || limit < 1 || limit > MAX_REPLAY_EVENTS;
    const hasInvalidSelection =
      ids !== undefined && (ids.length === 0 || ids.length > MAX_REPLAY_EVENTS);

    if (hasInvalidLimit)
      throw new Error(`Publication limit must be between 1 and ${MAX_REPLAY_EVENTS}`);

    if (hasInvalidSelection)
      throw new Error("Publication IDs must be a bounded nonempty selection");

    const abortSignal = AbortSignal.timeout(PUBLICATION_BUDGET_MS);
    const events = await this.runBookkeeping((transaction) =>
      transaction.outboxEvent.findMany({
        where: { publishedAt: null, ...(ids ? { id: { in: ids } } : {}) },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: limit,
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
          entityType: event.entityType,
          entityId: event.entityId,
          eventType: event.eventType,
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
              publishAttemptCount: { increment: 1 },
              lastPublishErrorCode: null,
            },
          }),
        );

        outcomes.push({ id: event.id, status: "published" });
      } catch (error) {
        this.logger.warn({
          event: "outbox_publication_failed",
          eventId: event.id,
          entityId: event.entityId,
          code,
          outcome: hasAcknowledgment ? "uncertain" : "failed",
          err: error,
        });

        try {
          await this.runBookkeeping((transaction) =>
            transaction.outboxEvent.updateMany({
              where: { id: event.id, publishedAt: null },
              data: { publishAttemptCount: { increment: 1 }, lastPublishErrorCode: code },
            }),
          );
        } catch (bookkeepingError) {
          this.logger.error({
            event: "outbox_bookkeeping_failed",
            eventId: event.id,
            entityId: event.entityId,
            code,
            outcome: "failed",
            err: bookkeepingError,
          });
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
