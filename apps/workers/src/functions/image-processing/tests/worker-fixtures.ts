import { randomUUID } from "node:crypto";
import { type File, FilePurpose, FileStatus, type PrismaClient } from "@leonly/database/client";
import type { ImageEvent } from "@leonly/utils/contracts";
import { ObjectSizeError } from "@leonly/utils/storage";
import { vi } from "vitest";

type MatchesFileParams = { file: File; where: Record<string, unknown> };
type NewFile = Omit<
  File,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "operationLockToken"
  | "operationLockExpiresAt"
  | "lastErrorCode"
>;

function matchesFile({ file, where }: MatchesFileParams): boolean {
  return Object.entries(where).every(([field, expected]) => {
    if (field === "OR" && Array.isArray(expected)) {
      return expected.some((condition) => matchesFile({ file, where: condition }));
    }

    const actual = file[field as keyof File];
    if (typeof expected === "object" && expected !== null && !(expected instanceof Date)) {
      if ("in" in expected && Array.isArray(expected.in)) return expected.in.includes(actual);
      if ("gt" in expected) return actual instanceof Date && actual > (expected.gt as Date);
      if ("lte" in expected) return actual instanceof Date && actual <= (expected.lte as Date);
    }

    return actual === expected;
  });
}

export function createWorkerFixtures(bytes: Buffer) {
  const fileId = randomUUID();
  const memoryId = randomUUID();
  const spaceId = randomUUID();
  const objectKey = `memories/${spaceId}/${fileId}/original`;
  const event: ImageEvent = {
    id: randomUUID(),
    entityType: "file",
    entityId: fileId,
    eventType: "ImageVariantsRequested",
    createdAt: new Date().toISOString(),
    payload: { memoryId, spaceId, variantNames: ["cover", "detail"] },
  };
  const space = { id: spaceId, deletedAt: null as Date | null };
  const memory = { id: memoryId, deletedAt: null as Date | null, space };
  const file: File = {
    id: fileId,
    spaceId,
    uploadedByUserId: "user-a",
    originalFileId: null,
    variantName: null,
    objectKey,
    originalFilename: "photo.png",
    mimeType: "image/png",
    sizeBytes: BigInt(bytes.length),
    purpose: FilePurpose.memory_image,
    status: FileStatus.ready,
    operationLockToken: null,
    operationLockExpiresAt: null,
    lastErrorCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const memoryFiles = [
    {
      memoryId,
      fileId,
      spaceId,
      position: 0,
      memory,
    },
  ];
  const files = new Map<string, File>([[fileId, file]]);
  const storageObjects = new Map([[file.objectKey, bytes]]);
  let isInTransaction = false;
  let isMissing = false;

  const prisma = {
    file: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (isMissing) return null;
        const currentFile = files.get(where.id);
        if (!currentFile) return null;
        if (currentFile.id !== fileId) return structuredClone(currentFile);

        return structuredClone({ ...currentFile, space, memoryFiles });
      }),
      findFirst: vi.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          [...files.values()].find((candidate) => matchesFile({ file: candidate, where })) ?? null,
      ),
      create: vi.fn(async ({ data }: { data: NewFile }) => {
        const variantFile: File = {
          ...data,
          id: randomUUID(),
          operationLockToken: null,
          operationLockExpiresAt: null,
          lastErrorCode: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        files.set(variantFile.id, variantFile);
        return variantFile;
      }),
      updateMany: vi.fn(
        async ({ where, data }: { where: Record<string, unknown>; data: Partial<File> }) => {
          if (isMissing) return { count: 0 };
          const selected = [...files.values()].filter((candidate) =>
            matchesFile({ file: candidate, where }),
          );
          for (const currentFile of selected) Object.assign(currentFile, data);
          return { count: selected.length };
        },
      ),
    },
    $transaction: vi.fn(async (operation: (transaction: unknown) => Promise<unknown>) => {
      const snapshot = structuredClone([...files.entries()]);
      isInTransaction = true;
      try {
        return await operation(prisma);
      } catch (error) {
        files.clear();
        for (const [id, currentFile] of snapshot) files.set(id, currentFile);
        throw error;
      } finally {
        isInTransaction = false;
      }
    }),
  };
  const storage = {
    getObject: vi.fn(async ({ key, maxBytes }: { key: string; maxBytes: number }) => {
      if (isInTransaction) throw new Error("Storage must not run inside a transaction");
      const stored = storageObjects.get(key);
      if (stored && stored.length > maxBytes) throw new ObjectSizeError("Too large");
      return stored ?? null;
    }),
    putObjectIfAbsent: vi.fn(
      async ({ key, bytes }: { key: string; bytes: Buffer; contentType: string }) => {
        if (isInTransaction) throw new Error("Storage must not run inside a transaction");
        if (storageObjects.has(key)) return "exists" as const;
        storageObjects.set(key, bytes);
        return "created" as const;
      },
    ),
  };

  return {
    event,
    fileId,
    file,
    files,
    memory,
    space,
    memoryFiles,
    storage,
    storageObjects,
    prisma,
    dependencies: {
      prisma: prisma as unknown as PrismaClient,
      storage,
      logger: { info: vi.fn(), error: vi.fn() },
    },
    setMissing: () => {
      isMissing = true;
    },
  };
}
