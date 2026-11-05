import { retry } from "@leonly/utils";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
import {
  ACTIVE_INVITE_CODE_INDEX,
  INVITE_CODE_TTL_MS,
  MAX_SPACE_MEMBERS,
} from "../constants/spaces.constants";
import type { RegenerateReturn } from "../types/spaces.types";
import { generateInviteCode, getUniqueIndex } from "../utils/invite-code";
import { MembershipsService } from "./memberships.service";

const MAX_REGENERATION_ATTEMPTS = 10;

@Injectable()
export class InviteRegenerationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly membershipsService: MembershipsService,
  ) {}

  async regenerate(userId: string): Promise<RegenerateReturn> {
    return this.redisService.withLock({
      key: `invite-regeneration:${userId}:mutex`,
      operation: async () => {
        await this.membershipsService.requireActiveMembership(userId);

        return retry(
          () =>
            this.prismaService.$transaction(async (transaction) => {
              const spaces = await transaction.$queryRaw<
                Array<{ id: string; expiresAt: Date | null }>
              >`
                SELECT s.id, s.invite_code_expires_at AS "expiresAt"
                FROM spaces s JOIN space_members c ON c.space_id = s.id
                WHERE c.user_id = ${userId} AND c.deleted_at IS NULL AND s.deleted_at IS NULL
                FOR UPDATE OF s
              `;
              const space = spaces[0];
              if (!space) throw new NotFoundException();

              const memberCount = await transaction.spaceMember.count({
                where: { spaceId: space.id, deletedAt: null },
              });
              if (memberCount === MAX_SPACE_MEMBERS) {
                throw new ConflictException({
                  errors: [
                    { code: "joined", message: "Your partner has already joined this space." },
                  ],
                });
              }

              const hasValidInvite = space.expiresAt && space.expiresAt.getTime() > Date.now();
              const isRegenerationUnavailable = memberCount !== 1 || hasValidInvite;
              if (isRegenerationUnavailable) throw new NotFoundException();

              const updated = await transaction.space.update({
                where: { id: space.id },
                data: {
                  inviteCode: generateInviteCode(),
                  inviteCodeExpiresAt: new Date(Date.now() + INVITE_CODE_TTL_MS),
                  updatedByUserId: userId,
                },
                select: { inviteCode: true, inviteCodeExpiresAt: true },
              });

              const { inviteCode, inviteCodeExpiresAt } = updated;
              const isGeneratedInviteMissing = !inviteCode || !inviteCodeExpiresAt;
              if (isGeneratedInviteMissing) throw new Error("Invite generation returned no code.");

              return {
                invite_code: inviteCode,
                invite_code_expires_at: inviteCodeExpiresAt.toISOString(),
              };
            }),
          {
            maxAttempts: MAX_REGENERATION_ATTEMPTS,
            shouldRetry: (error) => getUniqueIndex(error) === ACTIVE_INVITE_CODE_INDEX,
          },
        );
      },
    });
  }
}
