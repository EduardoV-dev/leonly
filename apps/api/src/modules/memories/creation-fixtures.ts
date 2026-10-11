import { randomUUID } from "node:crypto";
import { type FileUpload, type Memory, Prisma } from "@leonly/database/client";
import { ObjectSizeError, type ObjectStorage } from "@leonly/utils/storage";
import { vi } from "vitest";
import type { OutboxPublisher, PublicationOutcome } from "../../common/outbox/outbox-publisher";
import type { PrismaService } from "../../common/prisma/prisma.service";
import { UploadFinalizationService } from "../files/upload-finalization.service";
import { MemoriesService } from "./memories.service";

export const SPACE_ID = "01900000-0000-7000-8000-000000000005";
export const MEMBER_ID = "01900000-0000-7000-8000-000000000006";
export const CREATION_ID = "01900000-0000-7000-8000-000000000004";

export function creationRequest(uploadIds: string[] = []) {
  return {
    title: "A day together",
    memoryDate: "2026-10-10",
    timezone: "UTC",
    visibility: "timeline",
    uploadIds,
    idempotencyKey: CREATION_ID,
  };
}

function matchesUpload(upload: FileUpload, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([field, expected]) => {
    if (field === "OR" && Array.isArray(expected)) {
      return expected.some((condition) => matchesUpload(upload, condition));
    }
    const actual = upload[field as keyof FileUpload];
    if (typeof expected === "object" && expected !== null && !(expected instanceof Date)) {
      if ("in" in expected && Array.isArray(expected.in)) return expected.in.includes(actual);
      if ("gt" in expected) return actual instanceof Date && actual > (expected.gt as Date);
      if ("lte" in expected) return actual instanceof Date && actual <= (expected.lte as Date);
    }
    return actual === expected;
  });
}

export function createCreationFixtures() {
  const state = {
    uploads: new Map<string, FileUpload>(),
    memories: [] as Memory[],
    assets: [] as Record<string, unknown>[],
    objects: [] as Record<string, unknown>[],
    events: [] as Record<string, unknown>[],
    activeMembership: true,
    inTransaction: false,
    rollbacks: 0,
  };
  const storageObjects = new Map<string, Buffer>();
  const prisma = {
    spaceMember: {
      findFirst: vi.fn(async () =>
        state.activeMembership ? { id: MEMBER_ID, spaceId: SPACE_ID } : null,
      ),
    },
    fileUpload: {
      findFirst: vi.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          [...state.uploads.values()].find((upload) => matchesUpload(upload, where)) ?? null,
      ),
      updateMany: vi.fn(
        async ({ where, data }: { where: Record<string, unknown>; data: Partial<FileUpload> }) => {
          const uploads = [...state.uploads.values()].filter((upload) =>
            matchesUpload(upload, where),
          );
          for (const upload of uploads) state.uploads.set(upload.id, { ...upload, ...data });
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
            state.memories.find(
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
          data: Omit<Memory, "id" | "coverAssetId" | "deletedAt" | "createdAt" | "updatedAt">;
        }) => {
          const existing = state.memories.some(
            (memory) =>
              memory.spaceId === data.spaceId &&
              memory.createdByUserId === data.createdByUserId &&
              memory.idempotencyKey === data.idempotencyKey,
          );
          if (existing)
            throw new Prisma.PrismaClientKnownRequestError("duplicate key", {
              code: "P2002",
              clientVersion: "7",
            });
          const memory = {
            ...data,
            id: randomUUID(),
            coverAssetId: null,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.memories.push(memory);
          return { id: memory.id, visibility: memory.visibility };
        },
      ),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: { coverAssetId: string } }) => {
          const memory = state.memories.find((memory) => memory.id === where.id);
          if (!memory) throw new Error("Missing memory");
          Object.assign(memory, data);
          return memory;
        },
      ),
    },
    memoryAsset: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.assets.push(data);
        return data;
      }),
    },
    memoryAssetObject: {
      createMany: vi.fn(async ({ data }: { data: Record<string, unknown>[] }) => {
        state.objects.push(...data);
        return { count: data.length };
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
            publicationAttempts: 0,
            lastPublicationError: null,
          };
          state.events.push(event);
          return event;
        },
      ),
      findMany: vi.fn(async ({ where, take }: { where: { id?: { in: string[] } }; take: number }) =>
        state.events
          .filter(
            (event) =>
              event.publishedAt === null && (!where.id || where.id.in.includes(event.id as string)),
          )
          .slice(0, take),
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: {
            publicationAttempts: { increment: number };
            publishedAt?: Date;
            lastPublicationError: string | null;
          };
        }) => {
          const event = state.events.find(
            (event) => event.id === where.id && event.publishedAt === null,
          );
          if (!event) return { count: 0 };
          event.publicationAttempts =
            (event.publicationAttempts as number) + data.publicationAttempts.increment;
          event.lastPublicationError = data.lastPublicationError;
          if (data.publishedAt) event.publishedAt = data.publishedAt;
          return { count: 1 };
        },
      ),
    },
    $queryRaw: vi.fn(async () => (state.activeMembership ? [{ id: MEMBER_ID }] : [])),
    $executeRaw: vi.fn(async () => 0),
    $transaction: vi.fn(async (operation: (transaction: unknown) => Promise<unknown>) =>
      runTransaction(operation),
    ),
  };

  let transactionTail = Promise.resolve();
  async function runTransaction(operation: (transaction: unknown) => Promise<unknown>) {
    const previous = transactionTail;
    let release = () => {};
    transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const snapshot = structuredClone({
      uploads: state.uploads,
      memories: state.memories,
      assets: state.assets,
      objects: state.objects,
      events: state.events,
    });
    state.inTransaction = true;
    try {
      return await operation(prisma);
    } catch (error) {
      Object.assign(state, snapshot);
      state.rollbacks++;
      throw error;
    } finally {
      state.inTransaction = false;
      release();
    }
  }

  const storage = {
    getObject: vi.fn(async (key: string, maxBytes: number) => {
      if (state.inTransaction) throw new Error("Storage must not run inside a transaction");
      const bytes = storageObjects.get(key);
      if (bytes && bytes.length > maxBytes) throw new ObjectSizeError("Too large");
      return bytes ?? null;
    }),
    putObjectIfAbsent: vi.fn(
      async ({ key, bytes }: { key: string; bytes: Buffer; contentType: string }) => {
        if (state.inTransaction) throw new Error("Storage must not run inside a transaction");
        if (storageObjects.has(key)) return "exists" as const;
        storageObjects.set(key, bytes);
        return "created" as const;
      },
    ),
  };
  const finalization = new UploadFinalizationService(
    prisma as unknown as PrismaService,
    storage as unknown as ObjectStorage,
  );
  const publisher = {
    publish: vi.fn(
      async (_options: { ids?: string[]; limit: number }): Promise<PublicationOutcome[]> => [],
    ),
  };
  const memories = new MemoriesService(
    prisma as unknown as PrismaService,
    finalization,
    publisher as unknown as OutboxPublisher,
  );

  function addUpload(bytes: Buffer, overrides: Partial<FileUpload> = {}): FileUpload {
    const id = randomUUID();
    const upload: FileUpload = {
      id,
      uploaderUserId: "user-a",
      spaceId: SPACE_ID,
      category: "image",
      purpose: "memory_image",
      originalFilename: "photo.png",
      declaredMimeType: "image/png",
      declaredByteSize: bytes.length,
      verifiedMimeType: null,
      verifiedByteSize: null,
      stagingKey: `staging/memories/${SPACE_ID}/${id}/original`,
      intendedFinalKey: `memories/${SPACE_ID}/${id}/original`,
      status: "issued",
      uploadUrlExpiresAt: new Date(Date.now() + 600_000),
      attachmentDeadline: new Date(Date.now() + 4_200_000),
      leaseToken: null,
      leaseExpiresAt: null,
      consumedAt: null,
      failureCode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
    state.uploads.set(upload.id, upload);
    storageObjects.set(upload.stagingKey, bytes);
    return upload;
  }
  return { state, prisma, storage, storageObjects, finalization, memories, addUpload, publisher };
}
