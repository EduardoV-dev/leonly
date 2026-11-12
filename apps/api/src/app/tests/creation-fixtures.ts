import { randomUUID } from "node:crypto";
import { type File, type Memory, Prisma } from "@leonly/database/client";
import { ObjectSizeError, ObjectStorage } from "@leonly/utils/storage";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { vi } from "vitest";
import { OutboxPublisher, type PublicationOutcome } from "../../common/outbox/outbox-publisher";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FilesService } from "../../modules/files/files.service";
import { MemoriesService } from "../../modules/memories/services/memories.service";
import type { CreationInput } from "../../modules/memories/utils/memory-creation.util";
import { MembershipsService } from "../../modules/spaces/services/memberships.service";
import { MEMBER_ID, matchesUpload, SPACE_ID } from "./prisma-predicates";

export { MEMBER_ID, matchesUpload, SPACE_ID };

@Module({})
class CreationFixtureModule {}

type CreationRequest = Pick<
  CreationInput,
  "title" | "memoryDate" | "timezone" | "visibility" | "uploadIds" | "idempotencyKey"
>;
type AddUploadParams = { bytes: Buffer; overrides?: Partial<File> };

export const CREATION_ID = "01900000-0000-7000-8000-000000000004";
export function createMemoryRequest(uploadIds: string[] = []): CreationRequest {
  return {
    title: "A day together",
    memoryDate: "2026-10-10",
    timezone: "UTC",
    visibility: "timeline",
    uploadIds,
    idempotencyKey: CREATION_ID,
  };
}

class CreationFixtures {
  readonly state = {
    uploads: new Map<string, File>(),
    memories: [] as Memory[],
    memoryFiles: [] as Record<string, unknown>[],
    events: [] as Record<string, unknown>[],
    hasActiveMembership: true,
    isInTransaction: false,
    rollbacks: 0,
  };
  readonly storageObjects = new Map<string, Buffer>();
  readonly prisma = {
    spaceMember: {
      findFirst: vi.fn(async () =>
        this.state.hasActiveMembership ? { id: MEMBER_ID, spaceId: SPACE_ID } : null,
      ),
    },
    file: {
      findFirst: vi.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          [...this.state.uploads.values()].find((upload) => matchesUpload({ upload, where })) ??
          null,
      ),
      updateMany: vi.fn(
        async ({ where, data }: { where: Record<string, unknown>; data: Partial<File> }) => {
          const uploads = [...this.state.uploads.values()].filter((upload) =>
            matchesUpload({ upload, where }),
          );
          for (const upload of uploads) this.state.uploads.set(upload.id, { ...upload, ...data });
          return { count: uploads.length };
        },
      ),
    },
    memory: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: {
            spaceId_createdByUserId_idempotencyKey: {
              spaceId: string;
              createdByUserId: string;
              idempotencyKey: string;
            };
          };
        }) => {
          const scope = where.spaceId_createdByUserId_idempotencyKey;
          return (
            this.state.memories.find(
              (memory) =>
                memory.spaceId === scope.spaceId &&
                memory.createdByUserId === scope.createdByUserId &&
                memory.idempotencyKey === scope.idempotencyKey,
            ) ?? null
          );
        },
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: Omit<Memory, "id" | "coverFileId" | "deletedAt" | "createdAt" | "updatedAt">;
        }) => {
          const hasExistingMemory = this.state.memories.some(
            (memory) =>
              memory.spaceId === data.spaceId &&
              memory.createdByUserId === data.createdByUserId &&
              memory.idempotencyKey === data.idempotencyKey,
          );
          if (hasExistingMemory)
            throw new Prisma.PrismaClientKnownRequestError("duplicate key", {
              code: "P2002",
              clientVersion: "7",
            });
          const memory = {
            ...data,
            id: randomUUID(),
            coverFileId: null,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.state.memories.push(memory);
          return { id: memory.id, visibility: memory.visibility };
        },
      ),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: { coverFileId: string } }) => {
          const memory = this.state.memories.find((memory) => memory.id === where.id);
          if (!memory) throw new Error("Missing memory");
          Object.assign(memory, data);
          return memory;
        },
      ),
    },
    memoryFile: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        this.state.memoryFiles.push(data);
        return data;
      }),
    },
    outboxEvent: {
      create: vi.fn(
        async ({ data }: { data: Record<string, unknown> }): Promise<Record<string, unknown>> => {
          const event = {
            ...data,
            id: randomUUID(),
            createdAt: new Date(),
            publishedAt: null,
            publishAttemptCount: 0,
            lastPublishErrorCode: null,
          };
          this.state.events.push(event);
          return event;
        },
      ),
      findMany: vi.fn(async ({ where, take }: { where: { id?: { in: string[] } }; take: number }) =>
        this.state.events
          .filter(
            (event) =>
              event.publishedAt === null && (!where.id || where.id.in.includes(event.id as string)),
          )
          .sort((first, second) => {
            const createdAtOrder =
              (first.createdAt as Date).getTime() - (second.createdAt as Date).getTime();

            return createdAtOrder || String(first.id).localeCompare(String(second.id));
          })
          .slice(0, take),
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: {
            publishAttemptCount: { increment: number };
            publishedAt?: Date;
            lastPublishErrorCode: string | null;
          };
        }) => {
          const event = this.state.events.find(
            (event) => event.id === where.id && event.publishedAt === null,
          );
          if (!event) return { count: 0 };
          event.publishAttemptCount =
            (event.publishAttemptCount as number) + data.publishAttemptCount.increment;
          event.lastPublishErrorCode = data.lastPublishErrorCode;
          if (data.publishedAt) event.publishedAt = data.publishedAt;
          return { count: 1 };
        },
      ),
    },
    $queryRaw: vi.fn(async () => (this.state.hasActiveMembership ? [{ id: MEMBER_ID }] : [])),
    $executeRaw: vi.fn(async () => 0),
    $transaction: vi.fn(async (operation: (transaction: unknown) => Promise<unknown>) =>
      this.runTransaction(operation),
    ),
  };

  private transactionTail = Promise.resolve();
  private async runTransaction(
    operation: (transaction: unknown) => Promise<unknown>,
  ): Promise<unknown> {
    const previous = this.transactionTail;
    let release = () => {};
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const snapshot = structuredClone({
      uploads: this.state.uploads,
      memories: this.state.memories,
      memoryFiles: this.state.memoryFiles,
      events: this.state.events,
    });
    this.state.isInTransaction = true;
    try {
      return await operation(this.prisma);
    } catch (error) {
      Object.assign(this.state, snapshot);
      this.state.rollbacks++;
      throw error;
    } finally {
      this.state.isInTransaction = false;
      release();
    }
  }

  readonly storage = {
    headObject: vi.fn(async (key: string) => {
      if (this.state.isInTransaction) throw new Error("Storage must not run inside a transaction");
      const bytes = this.storageObjects.get(key);
      return bytes ? { byteSize: bytes.length, contentType: "image/png" } : null;
    }),
    getObject: vi.fn(async ({ key, maxBytes }: { key: string; maxBytes: number }) => {
      if (this.state.isInTransaction) throw new Error("Storage must not run inside a transaction");
      const bytes = this.storageObjects.get(key);
      if (bytes && bytes.length > maxBytes) throw new ObjectSizeError("Too large");
      return bytes ?? null;
    }),
    putObjectIfAbsent: vi.fn(
      async ({ key, bytes }: { key: string; bytes: Buffer; contentType: string }) => {
        if (this.state.isInTransaction)
          throw new Error("Storage must not run inside a transaction");
        if (this.storageObjects.has(key)) return "exists" as const;
        this.storageObjects.set(key, bytes);
        return "created" as const;
      },
    ),
  };
  readonly publisher = {
    publish: vi.fn(
      async (_options: { ids?: string[]; limit: number }): Promise<PublicationOutcome[]> => [],
    ),
  };
  prismaService!: PrismaService;
  finalization!: FilesService;
  memories!: MemoriesService;

  async initialize(): Promise<void> {
    const app = await NestFactory.createApplicationContext(
      {
        module: CreationFixtureModule,
        providers: [
          { provide: PrismaService, useValue: this.prisma },
          {
            provide: ObjectStorage,
            useValue: this.storage satisfies Pick<
              ObjectStorage,
              "headObject" | "getObject" | "putObjectIfAbsent"
            >,
          },
          {
            provide: OutboxPublisher,
            useValue: this.publisher satisfies Pick<OutboxPublisher, "publish">,
          },
          FilesService,
          MemoriesService,
          MembershipsService,
        ],
      },
      { logger: false },
    );

    this.prismaService = app.get(PrismaService);
    this.finalization = app.get(FilesService);
    this.memories = app.get(MemoriesService);
    await app.close();
  }

  addUpload({ bytes, overrides = {} }: AddUploadParams): File {
    const id = randomUUID();
    const upload: File = {
      id,
      uploadedByUserId: "user-a",
      spaceId: SPACE_ID,
      objectKey: `memories/${SPACE_ID}/${id}/original`,
      originalFileId: null,
      variantName: null,
      mimeType: "image/png",
      sizeBytes: BigInt(bytes.length),
      originalFilename: "photo.png",
      purpose: "memory_image",
      status: "pending",
      operationLockToken: null,
      operationLockExpiresAt: null,
      lastErrorCode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
    this.state.uploads.set(upload.id, upload);
    this.storageObjects.set(upload.objectKey, bytes);
    return upload;
  }
}

export async function createCreationFixtures(): Promise<CreationFixtures> {
  const fixtures = new CreationFixtures();
  await fixtures.initialize();

  return fixtures;
}
