import { ObjectStorage, UPLOAD_URL_SECONDS } from "@leonly/utils/storage";
import { Injectable, NotFoundException } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ATTACHMENT_SECONDS, validateUploadRequest } from "./upload-validation";

export type UploadIssuanceResult = {
  uploads: {
    id: string;
    putUrl: string;
    requiredHeaders: { "Content-Type": string };
    expiresAt: string;
    attachmentDeadline: string;
  }[];
};

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  async issue(userId: string, body: unknown): Promise<UploadIssuanceResult> {
    const descriptors = validateUploadRequest(body);
    const membership = await this.prisma.spaceMember.findFirst({
      where: { userId, deletedAt: null, space: { deletedAt: null } },
      select: { spaceId: true },
    });
    if (!membership) throw new NotFoundException({ error: "An active space is required." });

    const issuedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    const expiresAt = new Date(issuedAt.getTime() + UPLOAD_URL_SECONDS * 1000);
    const attachmentDeadline = new Date(issuedAt.getTime() + ATTACHMENT_SECONDS * 1000);
    const records = descriptors.map((descriptor) => {
      const id = uuidv7();
      return {
        id,
        uploaderUserId: userId,
        spaceId: membership.spaceId,
        category: "image" as const,
        purpose: "memory_image" as const,
        originalFilename: descriptor.filename,
        declaredMimeType: descriptor.contentType,
        declaredByteSize: descriptor.byteSize,
        stagingKey: `staging/memories/${membership.spaceId}/${id}/original`,
        intendedFinalKey: `memories/${membership.spaceId}/${id}/original`,
        uploadUrlExpiresAt: expiresAt,
        attachmentDeadline,
      };
    });
    await this.prisma.fileUpload.createMany({ data: records });

    const uploads: UploadIssuanceResult["uploads"] = [];
    for (const record of records) {
      const putUrl = await this.storage.signUpload({
        key: record.stagingKey,
        contentType: record.declaredMimeType,
        issuedAt,
      });
      uploads.push({
        id: record.id,
        putUrl,
        requiredHeaders: { "Content-Type": record.declaredMimeType },
        expiresAt: expiresAt.toISOString(),
        attachmentDeadline: attachmentDeadline.toISOString(),
      });
    }
    return { uploads };
  }
}
