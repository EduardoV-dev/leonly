import type { MemoryVisibility, Prisma } from "@leonly/database/client";
import type { MemoryDetail } from "@leonly/utils/contracts";
import { ObjectStorage } from "@leonly/utils/storage";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { MembershipsService } from "../../spaces/services/memberships.service";
import { MemoryReactionsService } from "./memory-reactions.service";

const SIGNED_URL_SECONDS = 300;
const RELATED_MEMORIES_LIMIT = 3;

type GetDetailParams = {
  userId: string;
  memoryId: string;
  visibility: MemoryVisibility;
};

type GetRelatedMemoriesParams = {
  scope: Prisma.MemoryWhereInput;
  memoryId: string;
  spaceId: string;
  memberId: string;
};

@Injectable()
export class MemoryDetailService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storage: ObjectStorage,
    private readonly membershipsService: MembershipsService,
    private readonly memoryReactionsService: MemoryReactionsService,
  ) {}

  async getDetail({ userId, memoryId, visibility }: GetDetailParams): Promise<MemoryDetail> {
    const membership = await this.membershipsService.requireActiveMembership({ userId });

    const scope = {
      spaceId: membership.spaceId,
      visibility,
      deletedAt: null,
      space: { deletedAt: null, members: { some: { id: membership.id, userId, deletedAt: null } } },
    };

    const memory = await this.prismaService.memory.findFirst({
      where: { ...scope, id: memoryId },
      select: {
        id: true,
        title: true,
        memoryDate: true,
        createdAt: true,
        updatedAt: true,
        description: true,
        location: true,
        visibility: true,
        coverFileId: true,
        createdByMember: { select: { displayName: true, user: { select: { image: true } } } },
        memoryFiles: {
          where: { spaceId: membership.spaceId },
          orderBy: { position: "asc" },
          select: {
            fileId: true,
            file: {
              select: {
                variants: {
                  where: {
                    spaceId: membership.spaceId,
                    status: "ready",
                    variantName: { in: ["cover", "detail"] },
                  },
                  select: { variantName: true, objectKey: true },
                },
              },
            },
          },
        },
      },
    });
    if (!memory) throw new NotFoundException({ error: "Memory unavailable." });

    const signObject = (key: string | undefined): Promise<string | null> =>
      key ? this.storage.signObject({ key, expiresIn: SIGNED_URL_SECONDS }) : Promise.resolve(null);

    const orderedFiles = [...memory.memoryFiles].sort(
      (a, b) => Number(b.fileId === memory.coverFileId) - Number(a.fileId === memory.coverFileId),
    );

    const [photos, relatedMemories, reactions] = await Promise.all([
      Promise.all(
        orderedFiles.map(async ({ fileId, file }) => {
          const [coverUrl, detailUrl] = await Promise.all([
            signObject(file.variants.find((variant) => variant.variantName === "cover")?.objectKey),
            signObject(
              file.variants.find((variant) => variant.variantName === "detail")?.objectKey,
            ),
          ]);
          return { id: fileId, coverUrl, detailUrl };
        }),
      ),

      this.getRelatedMemories({
        scope,
        memoryId: memory.id,
        spaceId: membership.spaceId,
        memberId: membership.id,
      }),
      this.memoryReactionsService.getSummaries({
        memoryIds: [memoryId],
        spaceId: membership.spaceId,
        memberId: membership.id,
      }),
    ]);

    const reaction = reactions.get(memoryId);
    if (!reaction) throw new Error("Missing reaction summary.");

    return {
      id: memory.id,
      title: memory.title,
      memoryDate: memory.memoryDate.toISOString().slice(0, 10),
      createdAt: memory.createdAt.toISOString(),
      updatedAt: memory.updatedAt.toISOString(),
      description: memory.description,
      location: memory.location,
      visibility: memory.visibility,
      creatorDisplayName: memory.createdByMember.displayName,
      creatorAvatarUrl: memory.createdByMember.user.image,
      photos,
      relatedMemories,
      reaction,
    };
  }

  private async getRelatedMemories({
    scope,
    memoryId,
    spaceId,
    memberId,
  }: GetRelatedMemoriesParams): Promise<MemoryDetail["relatedMemories"]> {
    const related = await this.prismaService.memory.findMany({
      where: { ...scope, id: { not: memoryId } },
      orderBy: [{ memoryDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: RELATED_MEMORIES_LIMIT,
      select: {
        id: true,
        title: true,
        memoryDate: true,
        createdAt: true,
        description: true,
        location: true,
        coverFile: {
          select: {
            file: {
              select: {
                variants: {
                  where: { spaceId, status: "ready", variantName: "cover" },
                  select: { objectKey: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    const reactions = await this.memoryReactionsService.getSummaries({
      memoryIds: related.map(({ id }) => id),
      spaceId,
      memberId,
    });

    return Promise.all(
      related.map(async (item) => {
        const key = item.coverFile?.file.variants[0]?.objectKey;
        return {
          id: item.id,
          title: item.title,
          memoryDate: item.memoryDate.toISOString().slice(0, 10),
          createdAt: item.createdAt.toISOString(),
          description: item.description,
          location: item.location,
          coverPhotoUrl: key
            ? await this.storage.signObject({ key, expiresIn: SIGNED_URL_SECONDS })
            : null,
          reaction: reactions.get(item.id),
        };
      }),
    );
  }
}
