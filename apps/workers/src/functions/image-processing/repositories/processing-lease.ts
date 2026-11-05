import { randomUUID } from "node:crypto";
import { FileStatus, type Prisma, type PrismaClient } from "@leonly/database/client";
import { ImageProcessingError, type Variant } from "../services/image-recipe";

const PROCESSING_LEASE_MS = 300_000;

export type ProcessingLease = {
  fileId: string;
  token: string;
  expiresAt: Date;
};

type ClaimFileProcessingLeaseParams = {
  fileId: string;
  originalFileId: string | null;
  statuses: (typeof FileStatus.pending | typeof FileStatus.uploaded | typeof FileStatus.ready)[];
  prisma: PrismaClient | Prisma.TransactionClient;
};

type ClaimRootProcessingLeaseParams = { fileId: string; prisma: PrismaClient };

type ClaimVariantProcessingLeaseParams = {
  fileId: string;
  originalFileId: string;
  rootLease: ProcessingLease;
  prisma: PrismaClient;
};

type UpdateOwnedVariantParams = {
  fileId: string;
  originalFileId: string;
  variantName: Variant;
  rootLease: ProcessingLease;
  variantLease: ProcessingLease;
  mimeType: string;
  sizeBytes: number;
  prisma: PrismaClient;
};

type UpdateOwnedVariantFailureParams = {
  fileId: string;
  originalFileId: string;
  variantName: string;
  rootLease: ProcessingLease;
  variantLease: ProcessingLease;
  data: { status?: typeof FileStatus.failed; lastErrorCode: string };
  prisma: PrismaClient;
};

type RenewRootLeaseParams = {
  lease: ProcessingLease;
  prisma: PrismaClient | Prisma.TransactionClient;
};

type ReleaseProcessingLeaseParams = { lease: ProcessingLease; prisma: PrismaClient };

export async function claimRootProcessingLease({
  fileId,
  prisma,
}: ClaimRootProcessingLeaseParams): Promise<ProcessingLease> {
  return claimFileProcessingLease({
    fileId,
    originalFileId: null,
    statuses: [FileStatus.uploaded, FileStatus.ready],
    prisma,
  });
}

export async function claimVariantProcessingLease({
  fileId,
  originalFileId,
  rootLease,
  prisma,
}: ClaimVariantProcessingLeaseParams): Promise<ProcessingLease> {
  return prisma.$transaction(async (transaction) => {
    await renewRootLease({ lease: rootLease, prisma: transaction });

    return claimFileProcessingLease({
      fileId,
      originalFileId,
      statuses: [FileStatus.pending, FileStatus.uploaded],
      prisma: transaction,
    });
  });
}

async function claimFileProcessingLease({
  fileId,
  originalFileId,
  statuses,
  prisma,
}: ClaimFileProcessingLeaseParams): Promise<ProcessingLease> {
  const now = new Date();
  const token = randomUUID();
  const expiresAt = new Date(now.getTime() + PROCESSING_LEASE_MS);
  const claimed = await prisma.file.updateMany({
    where: {
      id: fileId,
      originalFileId,
      status: { in: statuses },
      OR: [{ operationLockToken: null }, { operationLockExpiresAt: { lte: now } }],
    },
    data: { operationLockToken: token, operationLockExpiresAt: expiresAt },
  });

  if (claimed.count !== 1) throw new ImageProcessingError("PROCESSING_BUSY");

  return { fileId, token, expiresAt };
}

export async function updateOwnedVariant({
  fileId,
  originalFileId,
  variantName,
  rootLease,
  variantLease,
  mimeType,
  sizeBytes,
  prisma,
}: UpdateOwnedVariantParams): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await renewRootLease({ lease: rootLease, prisma: transaction });
    const updated = await transaction.file.updateMany({
      where: {
        id: fileId,
        originalFileId,
        variantName,
        status: { in: [FileStatus.pending, FileStatus.uploaded] },
        operationLockToken: variantLease.token,
        operationLockExpiresAt: { gt: new Date() },
      },
      data: {
        status: FileStatus.ready,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
        lastErrorCode: null,
      },
    });

    if (updated.count !== 1) throw new ImageProcessingError("PROCESSING_OWNERSHIP_LOST");
  });
}

export async function updateOwnedVariantFailure({
  fileId,
  originalFileId,
  variantName,
  rootLease,
  variantLease,
  data,
  prisma,
}: UpdateOwnedVariantFailureParams): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await renewRootLease({ lease: rootLease, prisma: transaction });
    const updated = await transaction.file.updateMany({
      where: {
        id: fileId,
        originalFileId,
        variantName,
        status: { in: [FileStatus.pending, FileStatus.uploaded] },
        operationLockToken: variantLease.token,
        operationLockExpiresAt: { gt: new Date() },
      },
      data,
    });

    if (updated.count !== 1) throw new ImageProcessingError("PROCESSING_OWNERSHIP_LOST");
  });
}

export async function renewRootLease({ lease, prisma }: RenewRootLeaseParams): Promise<void> {
  const renewed = await prisma.file.updateMany({
    where: {
      id: lease.fileId,
      originalFileId: null,
      status: { in: [FileStatus.uploaded, FileStatus.ready] },
      operationLockToken: lease.token,
      operationLockExpiresAt: { gt: new Date() },
    },
    data: { operationLockExpiresAt: lease.expiresAt },
  });

  if (renewed.count !== 1) throw new ImageProcessingError("PROCESSING_OWNERSHIP_LOST");
}

export async function releaseProcessingLease({
  lease,
  prisma,
}: ReleaseProcessingLeaseParams): Promise<void> {
  await prisma.file.updateMany({
    where: { id: lease.fileId, operationLockToken: lease.token },
    data: { operationLockToken: null, operationLockExpiresAt: null },
  });
}
