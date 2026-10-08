import { retry } from "@leonly/utils";
import { ConflictException, HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RateLimitService } from "../../../common/rate-limit/rate-limit.service";
import { RedisService } from "../../../common/redis/redis.service";
import { generateInviteCode, getUniqueIndex } from "../../../common/utils/invite-code";
import { ACTIVE_INVITE_CODE_INDEX, INVITE_CODE_TTL_MS } from "../constants/spaces.constants";

const REGENERATION_LIMIT = 5;
const REGENERATION_WINDOW = "10 m";
const MAX_REGENERATION_ATTEMPTS = 10;

@Injectable()
export class InviteRegenerationService {
  private rateLimiter?: ReturnType<RateLimitService["create"]>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
    private readonly redis: RedisService,
  ) {}

  async regenerate(
    userId: string,
  ): Promise<{ invite_code: string; invite_code_expires_at: string }> {
    return this.redis.withLock(`invite-regeneration:${userId}:mutex`, async () => {
      const membership = await this.prisma.spaceMember.findFirst({
        where: { userId, deletedAt: null, space: { deletedAt: null } },
        select: { id: true },
      });
      if (!membership) throw new NotFoundException();

      this.rateLimiter ??= this.rateLimit.create({
        limit: REGENERATION_LIMIT,
        window: REGENERATION_WINDOW,
      });

      const identifier = `invite-regeneration:${userId}`;
      const { remaining, reset } = await this.rateLimiter.getRemaining(identifier);

      if (remaining === 0) {
        throw new HttpException(
          {
            error: "Too many invite requests. Try again in 10 minutes.",
            retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
          },
          429,
        );
      }

      await this.rateLimiter.record(identifier);

      return retry(
        () =>
          this.prisma.$transaction(async (transaction) => {
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
            if (memberCount === 2) {
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
    });
  }
}
