import { ObjectStorage, UPLOAD_URL_SECONDS } from "@leonly/utils/storage";
import { Injectable, NotFoundException } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ATTACHMENT_SECONDS } from "./constants/uploads.constants";
import type { IssueUploadsDto } from "./dtos/issue-uploads.dto";

export type UploadIssuanceResult = {
  uploads: {
    id: string;
    putUrl: string;
    requiredHeaders: { "Content-Type": string };
    expiresAt: string;
    attachmentDeadline: string;
  }[];
};

type IssueParams = { userId: string; body: IssueUploadsDto };

@Injectable()
export class FilesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  async issue({ userId, body }: IssueParams): Promise<UploadIssuanceResult> {
    const descriptors = body.files;
    const membership = await this.prismaService.spaceMember.findFirst({
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

    await this.prismaService.fileUpload.createMany({ data: records });

    const uploads = await Promise.all(
      records.map(async (record) => {
        const putUrl = await this.storage.signUpload({
          key: record.stagingKey,
          contentType: record.declaredMimeType,
          byteSize: record.declaredByteSize,
          issuedAt,
        });

        return {
          id: record.id,
          putUrl,
          requiredHeaders: { "Content-Type": record.declaredMimeType },
          expiresAt: expiresAt.toISOString(),
          attachmentDeadline: attachmentDeadline.toISOString(),
        };
      }),
    );

    return { uploads };
  }
}
