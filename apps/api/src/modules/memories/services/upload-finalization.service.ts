import { randomUUID } from "node:crypto";
import type { FileUpload } from "@leonly/database/client";
import { ObjectSizeError, ObjectStorage } from "@leonly/utils/storage";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  FINALIZATION_LEASE_SECONDS,
  MAX_IMAGE_BYTES,
} from "../../files/constants/uploads.constants";
import { InvalidImageError, validateFinalImage } from "../../files/utils/upload-validation.util";
import {
  throwCreationInProgressError,
  throwUnavailableUploadError,
} from "../utils/creation-errors.util";

export type FinalizedUpload = FileUpload & {
  leaseToken: string;
  verifiedMimeType: string;
  verifiedByteSize: number;
};

type FinalizeParams = { id: string; userId: string; spaceId: string };

@Injectable()
export class UploadFinalizationService {
  private readonly logger = new Logger(UploadFinalizationService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  async finalize({ id, userId, spaceId }: FinalizeParams): Promise<FinalizedUpload> {
    const now = new Date();
    const ownership = {
      id,
      uploaderUserId: userId,
      spaceId,
      category: "image" as const,
      purpose: "memory_image" as const,
      attachmentDeadline: { gt: now },
    };
    const upload = await this.prismaService.fileUpload.findFirst({ where: ownership });
    const isUploadUnavailable =
      !upload || upload.status === "consumed" || upload.status === "failed";

    if (isUploadUnavailable) throwUnavailableUploadError();

    const leaseToken = randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + FINALIZATION_LEASE_SECONDS * 1000);
    const claimed = await this.prismaService.fileUpload.updateMany({
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

      const finalized = await this.prismaService.fileUpload.updateMany({
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
      const isInvalidImage = error instanceof InvalidImageError || error instanceof ObjectSizeError;

      try {
        await this.prismaService.fileUpload.updateMany({
          where: {
            id: upload.id,
            leaseToken,
            status: "finalizing",
            ...(isInvalidImage ? { leaseExpiresAt: { gt: new Date() } } : {}),
          },
          data: isInvalidImage
            ? {
                status: "failed",
                failureCode: "INVALID_IMAGE",
                leaseToken: null,
                leaseExpiresAt: null,
              }
            : { leaseToken: null, leaseExpiresAt: null },
        });
      } catch {
        this.logger.warn({ event: "upload_finalization_cleanup_failed", uploadId: upload.id });
      }

      if (isInvalidImage) throwUnavailableUploadError();

      throw error;
    }
  }

  async release(uploads: FinalizedUpload[]): Promise<void> {
    for (const upload of uploads) {
      await this.prismaService.fileUpload.updateMany({
        where: { id: upload.id, leaseToken: upload.leaseToken, status: "finalized" },
        data: { leaseToken: null, leaseExpiresAt: null },
      });
    }
  }
}
