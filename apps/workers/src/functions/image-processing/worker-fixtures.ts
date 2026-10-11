import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@leonly/database/client";
import type { ImageEvent } from "@leonly/utils/contracts";
import { ObjectSizeError } from "@leonly/utils/storage";
import { vi } from "vitest";

export function createWorkerFixtures(bytes: Buffer) {
  const assetId = randomUUID();
  const memoryId = randomUUID();
  const spaceId = randomUUID();
  const originalKey = `memories/${spaceId}/${assetId}/original`;
  const event: ImageEvent = {
    id: randomUUID(),
    aggregateType: "memory_asset",
    aggregateId: assetId,
    eventType: "ImageVariantsRequested",
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    payload: { memoryId, spaceId, assetId, originalKey, generationRecipeVersion: 1 },
  };
  const upload = {
    id: assetId,
    status: "consumed",
    intendedFinalKey: originalKey,
    verifiedMimeType: "image/png",
    verifiedByteSize: bytes.length,
  };
  const asset: Record<string, unknown> & {
    processingLeaseToken: string | null;
    processingLeaseExpiresAt: Date | null;
  } = {
    id: assetId,
    memoryId,
    spaceId,
    uploadId: upload.id,
    generationRecipeVersion: 1,
    assetType: "image",
    processingLeaseToken: null as string | null,
    processingLeaseExpiresAt: null as Date | null,
  };
  const objects: Record<string, unknown>[] = ["original", "cover", "detail"].map((variant) => ({
    id: randomUUID(),
    assetId,
    variantType: variant,
    objectPath: `memories/${spaceId}/${assetId}/${variant === "original" ? "original" : `${variant}.webp`}`,
    status: variant === "original" ? "ready" : "pending",
    mimeType: variant === "original" ? "image/png" : null,
    byteSize: variant === "original" ? bytes.length : null,
    failureCode: null,
    readyAt: variant === "original" ? new Date() : null,
  }));
  const memory = {
    id: memoryId,
    deletedAt: null as Date | null,
    space: { deletedAt: null as Date | null },
  };
  const storageObjects = new Map([[originalKey, bytes]]);
  let isInTransaction = false;
  const storage = {
    getObject: vi.fn(async (key: string, maxBytes: number) => {
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
  let isMissing = false;
  const prisma = {
    memoryAsset: {
      findUnique: vi.fn(async () =>
        isMissing
          ? null
          : structuredClone({
              ...asset,
              objects,
              memory,
              upload,
            }),
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }) => {
          if (
            isMissing ||
            where.id !== event.payload.assetId ||
            where.generationRecipeVersion !== asset.generationRecipeVersion
          )
            return { count: 0 };
          if (where.memory && (memory.deletedAt || memory.space.deletedAt)) return { count: 0 };
          if (
            where.processingLeaseToken &&
            where.processingLeaseToken !== asset.processingLeaseToken
          )
            return { count: 0 };
          if (
            where.processingLeaseExpiresAt &&
            (!asset.processingLeaseExpiresAt || asset.processingLeaseExpiresAt <= new Date())
          )
            return { count: 0 };
          if (
            where.OR &&
            asset.processingLeaseToken &&
            asset.processingLeaseExpiresAt &&
            asset.processingLeaseExpiresAt > new Date()
          )
            return { count: 0 };
          Object.assign(asset, data);
          return { count: 1 };
        },
      ),
    },
    memoryAssetObject: {
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { variantType: string | { in: string[] }; status: { not: string } };
          data: Record<string, unknown>;
        }) => {
          const variants =
            typeof where.variantType === "string" ? [where.variantType] : where.variantType.in;
          const selected = objects.filter(
            (object) =>
              variants.includes(object.variantType as string) && object.status !== where.status.not,
          );
          for (const object of selected) Object.assign(object, data);
          return { count: selected.length };
        },
      ),
    },
    $transaction: vi.fn(async (operation: (transaction: unknown) => Promise<unknown>) => {
      const snapshot = structuredClone({ asset, objects });
      isInTransaction = true;
      try {
        return await operation(prisma);
      } catch (error) {
        Object.assign(asset, snapshot.asset);
        objects.splice(0, objects.length, ...snapshot.objects);
        throw error;
      } finally {
        isInTransaction = false;
      }
    }),
  };
  return {
    event,
    asset,
    objects,
    memory,
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
