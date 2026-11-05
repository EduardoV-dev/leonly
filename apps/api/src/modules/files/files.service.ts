import { randomUUID } from "node:crypto";
import { FilePurpose, type File as FileRecord, FileStatus } from "@leonly/database/client";
import { ObjectStorage, UPLOAD_URL_SECONDS } from "@leonly/utils/storage";
import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FILE_OPERATION_LEASE_SECONDS } from "./constants/uploads.constants";
import type { IssueUploadsDto } from "./dtos/issue-uploads.dto";

export type ClaimedFile = FileRecord & { operationLockToken: string; operationLockExpiresAt: Date };
type ConfirmUploadedParams = { id: string; userId: string; spaceId: string; purpose: FilePurpose };

export type UploadIssuanceResult = {
  uploads: {
    id: string;
    putUrl: string;
    requiredHeaders: { "Content-Type": string; "If-None-Match": "*" };
    expiresAt: string;
  }[];
};

type IssueParams = { userId: string; body: IssueUploadsDto };

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  async confirmUploaded({
    id,
    userId,
    spaceId,
    purpose,
  }: ConfirmUploadedParams): Promise<ClaimedFile> {
    const now = new Date();
    const ownership = {
      id,
      uploadedByUserId: userId,
      spaceId,
      purpose,
      originalFileId: null,
      variantName: null,
    };
    const file = await this.prismaService.file.findFirst({ where: ownership });
    if (!file || file.status === FileStatus.failed || file.status === FileStatus.deleting) {
      throw new NotFoundException({ error: "The upload is unavailable." });
    }

    const operationLockToken = randomUUID();
    const operationLockExpiresAt = new Date(now.getTime() + FILE_OPERATION_LEASE_SECONDS * 1000);
    const claimed = await this.prismaService.file.updateMany({
      where: {
        ...ownership,
        status: { in: [FileStatus.pending, FileStatus.uploaded, FileStatus.ready] },
        OR: [{ operationLockToken: null }, { operationLockExpiresAt: { lte: now } }],
      },
      data: { operationLockToken, operationLockExpiresAt },
    });
    if (claimed.count !== 1)
      throw new ConflictException({ error: "The file is in use. Try again." });

    try {
      const claimedFile = await this.prismaService.file.findFirst({
        where: { ...ownership, operationLockToken, operationLockExpiresAt: { gt: new Date() } },
      });
      if (!claimedFile)
        throw new ConflictException({ error: "File ownership was lost. Try again." });
      if (claimedFile.status !== FileStatus.pending)
        return { ...claimedFile, operationLockToken, operationLockExpiresAt };

      const object = await this.storage.headObject(claimedFile.objectKey);
      if (!object) throw new NotFoundException({ error: "The upload is unavailable." });

      const updated = await this.prismaService.file.updateMany({
        where: {
          ...ownership,
          status: FileStatus.pending,
          operationLockToken,
          operationLockExpiresAt: { gt: new Date() },
        },
        data: { status: FileStatus.uploaded, lastErrorCode: null },
      });
      if (updated.count !== 1)
        throw new ConflictException({ error: "File ownership was lost. Try again." });

      return {
        ...claimedFile,
        status: FileStatus.uploaded,
        lastErrorCode: null,
        operationLockToken,
        operationLockExpiresAt,
      };
    } catch (error) {
      try {
        await this.prismaService.file.updateMany({
          where: { id, operationLockToken, operationLockExpiresAt: { gt: new Date() } },
          data: {
            operationLockToken: null,
            operationLockExpiresAt: null,
            ...(error instanceof NotFoundException
              ? {}
              : { lastErrorCode: "UPLOAD_VERIFICATION_RETRYABLE" }),
          },
        });
      } catch {
        this.logger.warn({ event: "upload_confirmation_release_failed", fileId: id });
      }
      throw error;
    }
  }

  async release(uploads: readonly ClaimedFile[]): Promise<void> {
    for (const upload of uploads) {
      await this.prismaService.file.updateMany({
        where: { id: upload.id, operationLockToken: upload.operationLockToken },
        data: { operationLockToken: null, operationLockExpiresAt: null },
      });
    }
  }

  async issue({ userId, body }: IssueParams): Promise<UploadIssuanceResult> {
    const descriptors = body.files;
    const membership = await this.prismaService.spaceMember.findFirst({
      where: { userId, deletedAt: null, space: { deletedAt: null } },
      select: { spaceId: true },
    });
    if (!membership) throw new NotFoundException({ error: "An active space is required." });

    const issuedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    const expiresAt = new Date(issuedAt.getTime() + UPLOAD_URL_SECONDS * 1000);
    const records = descriptors.map((descriptor) => {
      const id = uuidv7();

      return {
        id,
        uploadedByUserId: userId,
        spaceId: membership.spaceId,
        objectKey: `memories/${membership.spaceId}/${id}/original`,
        mimeType: descriptor.contentType,
        sizeBytes: BigInt(descriptor.byteSize),
        originalFilename: descriptor.filename,
        purpose: FilePurpose.memory_image,
        status: FileStatus.pending,
        createdAt: issuedAt,
        updatedAt: issuedAt,
      };
    });

    await this.prismaService.file.createMany({ data: records });

    const uploads = await Promise.all(
      records.map(async (record) => {
        const putUrl = await this.storage.signUpload({
          key: record.objectKey,
          contentType: record.mimeType,
          byteSize: Number(record.sizeBytes),
          issuedAt,
        });

        return {
          id: record.id,
          putUrl,
          requiredHeaders: { "Content-Type": record.mimeType, "If-None-Match": "*" as const },
          expiresAt: expiresAt.toISOString(),
        };
      }),
    );

    return { uploads };
  }
}
