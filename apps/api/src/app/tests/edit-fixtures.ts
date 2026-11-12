import { randomUUID } from "node:crypto";
import { type File, type Memory } from "@leonly/database/client";
import { ObjectSizeError, ObjectStorage } from "@leonly/utils/storage";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { vi } from "vitest";
import { OutboxPublisher, type PublicationOutcome } from "../../common/outbox/outbox-publisher";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FilesService } from "../../modules/files/files.service";
import { MemoriesService } from "../../modules/memories/services/memories.service";
import { MemoryEditService } from "../../modules/memories/services/memory-edit.service";
import { MembershipsService } from "../../modules/spaces/services/memberships.service";
import { MEMBER_ID, SPACE_ID } from "./creation-fixtures";
import { createEditPrismaStub, type EditFixtureState } from "./edit-prisma-stub";

@Module({})
class EditFixtureModule {}

export const EDIT_MEMORY_ID = "01900000-0000-7000-8000-000000000004";
export const INITIAL_EDIT_TOKEN = new Date("2026-09-05T16:00:00.123Z");

export type EditSaveRequest = {
  title: string;
  description: string | null;
  location: string | null;
  memoryDate: string;
  timezone: string;
  visibility: "timeline" | "vault";
  lastKnownUpdatedAt: string;
  retainedPhotoIds: string[];
  uploadIds: string[];
  coverFileId: string | null;
};

export function createEditSaveRequest(overrides: Partial<EditSaveRequest> = {}): EditSaveRequest {
  return {
    title: "Our picnic",
    description: null,
    location: null,
    memoryDate: "2026-10-10",
    timezone: "UTC",
    visibility: "timeline",
    lastKnownUpdatedAt: INITIAL_EDIT_TOKEN.toISOString(),
    retainedPhotoIds: [],
    uploadIds: [],
    coverFileId: null,
    ...overrides,
  };
}

class EditFixtures {
  readonly state: EditFixtureState = {
    uploads: new Map<string, File>(),
    memories: [],
    memoryFiles: [],
    events: [],
    hasActiveMembership: true,
    isInTransaction: false,
    rollbacks: 0,
  };
  readonly storageObjects = new Map<string, Buffer>();
  readonly prisma = createEditPrismaStub({
    state: this.state,
    runTransaction: (operation) => this.runTransaction(operation),
  });

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
  edits!: MemoryEditService;

  addUpload({ bytes, overrides = {} }: { bytes: Buffer; overrides?: Partial<File> }): File {
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

  addMemory({
    attachmentIds = [],
    coverFileId = null,
    updatedAt = INITIAL_EDIT_TOKEN,
  }: {
    attachmentIds?: string[];
    coverFileId?: string | null;
    updatedAt?: Date;
  } = {}): Memory {
    const memory: Memory = {
      id: EDIT_MEMORY_ID,
      spaceId: SPACE_ID,
      createdByUserId: "user-a",
      createdByMemberId: MEMBER_ID,
      coverFileId,
      title: "Our picnic",
      description: null,
      location: null,
      memoryDate: new Date("2026-08-20T00:00:00.000Z"),
      visibility: "timeline",
      deletedAt: null,
      idempotencyKey: "01900000-0000-7000-8000-000000000099",
      creationRequestHash: "hash",
      createdAt: new Date("2026-08-20T10:00:00.000Z"),
      updatedAt,
    } as Memory;
    this.state.memories.push(memory);
    attachmentIds.forEach((fileId, position) => {
      this.state.memoryFiles.push({ memoryId: memory.id, fileId, spaceId: SPACE_ID, position });
    });

    return memory;
  }

  async initialize(): Promise<void> {
    const app = await NestFactory.createApplicationContext(
      {
        module: EditFixtureModule,
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
          MemoryEditService,
        ],
      },
      { logger: false },
    );

    this.prismaService = app.get(PrismaService);
    this.finalization = app.get(FilesService);
    this.edits = app.get(MemoryEditService);
    await app.close();
  }
}

export { formatToken } from "./edit-prisma-stub";

export async function createEditFixtures(): Promise<EditFixtures> {
  const fixtures = new EditFixtures();
  await fixtures.initialize();

  return fixtures;
}
