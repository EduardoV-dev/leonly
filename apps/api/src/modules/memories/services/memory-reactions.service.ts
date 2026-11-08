import type { Prisma } from "@leonly/database/client";
import type { MemoryReactionSummary, MemoryReactionType } from "@leonly/utils/contracts";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { MembershipsService } from "../../spaces/services/memberships.service";
import { MemoriesService } from "./memories.service";

type ReactionScope = { userId: string; memoryId: string };
type ToggleReactionParams = ReactionScope & { reactionType: MemoryReactionType };

type GetSummariesParams = {
  memoryIds: string[];
  spaceId: string;
  memberId: string;
  transaction?: Prisma.TransactionClient;
};

const createEmptySummary = (): MemoryReactionSummary => ({
  counts: { heart: 0, laugh: 0, cry: 0, star: 0 },
  currentReaction: null,
  members: { heart: [], laugh: [], cry: [], star: [] },
});

@Injectable()
export class MemoryReactionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly membershipsService: MembershipsService,
    private readonly memoriesService: MemoriesService,
  ) {}

  async getSummaries({
    memoryIds,
    spaceId,
    memberId,
    transaction = this.prismaService,
  }: GetSummariesParams): Promise<Map<string, MemoryReactionSummary>> {
    if (memoryIds.length === 0) return new Map();

    const summaries = new Map(memoryIds.map((id) => [id, createEmptySummary()]));

    const rows = await transaction.memoryReaction.findMany({
      where: {
        memoryId: { in: memoryIds },
        spaceId,
        reactedByMember: { deletedAt: null, spaceId },
      },
      select: {
        memoryId: true,
        reactionType: true,
        reactedByMemberId: true,
        reactedByMember: { select: { displayName: true } },
      },
    });

    for (const row of rows) {
      const summary = summaries.get(row.memoryId);
      if (!summary) continue;

      summary.counts[row.reactionType] += 1;
      summary.members[row.reactionType].push(row.reactedByMember.displayName);

      if (row.reactedByMemberId === memberId) summary.currentReaction = row.reactionType;
    }

    for (const summary of summaries.values()) {
      for (const names of Object.values(summary.members)) names.sort();
    }

    return summaries;
  }

  async read({ userId, memoryId }: ReactionScope): Promise<MemoryReactionSummary> {
    const membership = await this.membershipsService.requireActiveMembership({ userId });
    await this.memoriesService.requireActiveMemory({ userId, memoryId, membership });

    const summaries = await this.getSummaries({
      memoryIds: [memoryId],
      spaceId: membership.spaceId,
      memberId: membership.id,
    });
    const summary = summaries.get(memoryId);
    if (!summary) throw new Error("Missing reaction summary.");

    return summary;
  }

  async toggle({
    userId,
    memoryId,
    reactionType,
  }: ToggleReactionParams): Promise<MemoryReactionSummary> {
    const membership = await this.membershipsService.requireActiveMembership({ userId });

    return this.prismaService.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM memories WHERE id = ${memoryId}::uuid FOR UPDATE`;

      await this.memoriesService.requireActiveMemory({ userId, memoryId, membership, transaction });

      const where = { reactedByMemberId_memoryId: { reactedByMemberId: membership.id, memoryId } };
      const current = await transaction.memoryReaction.findUnique({ where });

      if (current?.reactionType === reactionType) {
        await transaction.memoryReaction.delete({ where });
      } else if (current) {
        await transaction.memoryReaction.update({ where, data: { reactionType } });
      } else {
        await transaction.memoryReaction.create({
          data: {
            spaceId: membership.spaceId,
            memoryId,
            reactedByMemberId: membership.id,
            reactionType,
          },
        });
      }

      const summaries = await this.getSummaries({
        memoryIds: [memoryId],
        spaceId: membership.spaceId,
        memberId: membership.id,
        transaction,
      });
      const summary = summaries.get(memoryId);
      if (!summary) throw new Error("Missing reaction summary.");

      return summary;
    });
  }
}
