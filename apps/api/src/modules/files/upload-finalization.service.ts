import { randomUUID } from "node:crypto";
import type { FileUpload } from "@leonly/database/client";
import { ObjectSizeError, ObjectStorage } from "@leonly/utils/storage";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  throwCreationInProgressError,
  throwUnavailableUploadError,
} from "../memories/creation-errors";
import {
  FINALIZATION_LEASE_SECONDS,
  InvalidImageError,
  MAX_IMAGE_BYTES,
  validateFinalImage,
} from "./upload-validation";

export type FinalizedUpload = FileUpload & {
  leaseToken: string;
  verifiedMimeType: string;
  verifiedByteSize: number;
};

@Injectable()
export class UploadFinalizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  async finalize(options: {
    id: string;
    userId: string;
    spaceId: string;
  }): Promise<FinalizedUpload> {
    const now = new Date();
    const ownership = {
      id: options.id,
      uploaderUserId: options.userId,
      spaceId: options.spaceId,
      category: "image" as const,
      purpose: "memory_image" as const,
      attachmentDeadline: { gt: now },
    };
    const upload = await this.prisma.fileUpload.findFirst({ where: ownership });
    if (!upload || upload.status === "consumed" || upload.status === "failed")
      throwUnavailableUploadError();
    const leaseToken = randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + FINALIZATION_LEASE_SECONDS * 1000);
    const claimed = await this.prisma.fileUpload.updateMany({
      where: {
        ...ownership,
        status: { in: ["issued", "finalizing", "finalized"] },
        OR: [{ leaseToken: null }, { leaseExpiresAt: { lte: now } }],
      },
      data: { status: "finalizing", leaseToken, leaseExpiresAt },
    });
    if (claimed.count !== 1) throwCreationInProgressError();

    try {
      let bytes = await this.storage.getObject(upload.intendedFinalKey, MAX_IMAGE_BYTES);
      if (bytes === null) {
        const staged = await this.storage.getObject(upload.stagingKey, MAX_IMAGE_BYTES);
        if (staged === null) throwUnavailableUploadError();
        await this.storage.putObjectIfAbsent({
          key: upload.intendedFinalKey,
          bytes: staged,
          contentType: upload.declaredMimeType,
        });
        bytes = await this.storage.getObject(upload.intendedFinalKey, MAX_IMAGE_BYTES);
        if (bytes === null) throw new Error("Promoted original is missing");
      }
      const metadata = await validateFinalImage({
        bytes,
        declaredMimeType: upload.declaredMimeType,
        declaredByteSize: upload.declaredByteSize,
      });
      const finalized = await this.prisma.fileUpload.updateMany({
        where: {
          ...ownership,
          status: "finalizing",
          leaseToken,
          leaseExpiresAt: { gt: new Date() },
        },
        data: {
          status: "finalized",
          verifiedMimeType: metadata.mimeType,
          verifiedByteSize: metadata.byteSize,
          failureCode: null,
        },
      });
      if (finalized.count !== 1) throwCreationInProgressError();
      return {
        ...upload,
        status: "finalized",
        leaseToken,
        leaseExpiresAt,
        verifiedMimeType: metadata.mimeType,
        verifiedByteSize: metadata.byteSize,
      };
    } catch (error) {
      if (error instanceof InvalidImageError || error instanceof ObjectSizeError) {
        await this.prisma.fileUpload.updateMany({
          where: {
            id: upload.id,
            leaseToken,
            status: "finalizing",
            leaseExpiresAt: { gt: new Date() },
          },
          data: {
            status: "failed",
            failureCode: "INVALID_IMAGE",
            leaseToken: null,
            leaseExpiresAt: null,
          },
        });
        throwUnavailableUploadError();
      }
      await this.prisma.fileUpload.updateMany({
        where: { id: upload.id, leaseToken, status: "finalizing" },
        data: { leaseToken: null, leaseExpiresAt: null },
      });
      throw error;
    }
  }

  async release(uploads: FinalizedUpload[]): Promise<void> {
    for (const upload of uploads) {
      await this.prisma.fileUpload.updateMany({
        where: { id: upload.id, leaseToken: upload.leaseToken, status: "finalized" },
        data: { leaseToken: null, leaseExpiresAt: null },
      });
    }
  }
}
