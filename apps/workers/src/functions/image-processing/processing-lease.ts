import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@leonly/database/client";
import type { ImageEvent } from "@leonly/utils/contracts";
import { ImageProcessingError, type Variant } from "../../services/image/image-recipe";
import { VARIANTS } from "./load-image-asset";

const PROCESSING_LEASE_MS = 300_000;

export type ProcessingLease = {
  assetId: string;
  generationRecipeVersion: number;
  token: string;
  expiresAt: Date;
};

export async function claimProcessingLease(
  payload: ImageEvent["payload"],
  prisma: PrismaClient,
): Promise<ProcessingLease> {
  const { assetId, generationRecipeVersion } = payload;
  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PROCESSING_LEASE_MS);
  const claimed = await prisma.memoryAsset.updateMany({
    where: {
      id: assetId,
      generationRecipeVersion,
      memory: { deletedAt: null, space: { deletedAt: null } },
      OR: [{ processingLeaseToken: null }, { processingLeaseExpiresAt: { lte: now } }],
    },
    data: { processingLeaseToken: token, processingLeaseExpiresAt: expiresAt },
  });

  if (claimed.count !== 1) throw new ImageProcessingError("PROCESSING_BUSY");

  return { assetId, generationRecipeVersion, token, expiresAt };
}

export async function updateOwnedObjects({
  prisma,
  lease,
  changes,
  variant,
}: {
  prisma: PrismaClient;
  lease: ProcessingLease;
  changes: Prisma.MemoryAssetObjectUpdateManyMutationInput;
  variant?: Variant;
}): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const owned = await transaction.memoryAsset.updateMany({
      where: {
        id: lease.assetId,
        generationRecipeVersion: lease.generationRecipeVersion,
        processingLeaseToken: lease.token,
        processingLeaseExpiresAt: { gt: new Date() },
        memory: { deletedAt: null, space: { deletedAt: null } },
      },
      data: { processingLeaseExpiresAt: lease.expiresAt },
    });

    if (owned.count !== 1) throw new ImageProcessingError("PROCESSING_OWNERSHIP_LOST");

    const updated = await transaction.memoryAssetObject.updateMany({
      where: {
        assetId: lease.assetId,
        variantType: variant ?? { in: [...VARIANTS] },
        status: { not: "ready" },
      },
      data: changes,
    });

    if (variant && updated.count !== 1) throw new ImageProcessingError("VARIANT_STATE_CHANGED");
  });
}

export async function releaseProcessingLease(
  lease: ProcessingLease,
  prisma: PrismaClient,
): Promise<void> {
  await prisma.memoryAsset.updateMany({
    where: {
      id: lease.assetId,
      generationRecipeVersion: lease.generationRecipeVersion,
      processingLeaseToken: lease.token,
    },
    data: { processingLeaseToken: null, processingLeaseExpiresAt: null },
  });
}
