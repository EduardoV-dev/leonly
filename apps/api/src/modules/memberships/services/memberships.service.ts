import { isValidInviteCode, normalizeInviteCode } from "@leonly/utils/invite-code";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { POSTGRES_TIMESTAMP_FORMAT } from "../../../common/constants/timestamp.constants";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { normalizeDisplayName } from "../../../common/utils/display-name";
import { getUniqueIndex } from "../../../common/utils/invite-code";
import { SpaceMemberRole } from "../../../generated/prisma/client";
import {
  ACTIVE_SPACE_MEMBER_INDEX,
  ACTIVE_SPACE_ROLE_INDEX,
  JOIN_FAILURE_LIMIT,
  JOIN_LOCK_SECONDS,
} from "../constants/memberships.constants";
import type {
  DisplayNameEditResult,
  JoinParams,
  JoinResult,
  ValidateInviteParams,
} from "../memberships.types";
import { JoinAttemptRateLimiter } from "./join-attempt-rate-limiter";

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly joinAttempts: JoinAttemptRateLimiter,
  ) {}

  async updateDisplayName({
    userId,
    displayName,
    expectedUpdatedAt,
  }: {
    userId: string;
    displayName: string;
    expectedUpdatedAt: string;
  }): Promise<DisplayNameEditResult> {
    return this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ memberId: string }>>`
        SELECT c.id AS "memberId"
        FROM space_members c JOIN spaces s ON s.id = c.space_id
        WHERE c.user_id = ${userId} AND c.deleted_at IS NULL AND s.deleted_at IS NULL
        FOR UPDATE OF s, c
      `;
      const current = rows[0];
      if (!current) throw new NotFoundException({ error: "This shared space is unavailable." });
      const updated = await transaction.$queryRaw<Array<{ updatedAt: string }>>`
        UPDATE space_members SET display_name = ${displayName}, updated_at = clock_timestamp()
        WHERE id = ${current.memberId}::uuid AND updated_at = ${expectedUpdatedAt}::timestamptz
        RETURNING to_char(updated_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "updatedAt"
      `;
      const revision = updated[0]?.updatedAt;
      if (!revision) throw new ConflictException();
      return {
        displayName,
        status: "updated",
        updatedAt: revision,
      };
    });
  }

  async completeSetup(userId: string): Promise<{ completed: true }> {
    const result = await this.prisma.spaceMember.updateMany({
      where: { userId, deletedAt: null, space: { deletedAt: null } },
      data: { onboardingCompletedAt: new Date() },
    });

    if (result.count === 0) {
      throw new ConflictException({ error: "You do not belong to an active space." });
    }
    return { completed: true };
  }

  async validateInvite({
    userId,
    inviteCode,
  }: ValidateInviteParams): Promise<
    Exclude<JoinResult, { status: "joined" }> | { status: "valid" }
  > {
    return this.joinAttempts.withUserLock(userId, async () => {
      const lock = getActiveLock(await this.joinAttempts.getState(userId), new Date());
      if (lock) return lock;

      const result = await this.prisma.$transaction(async (transaction) => {
        const isCodeValid = isValidInviteCode(inviteCode);
        if (!isCodeValid) return { status: "malformed" } as const;
        const normalizedCode = normalizeInviteCode(inviteCode);

        const [space, existingMember] = await Promise.all([
          transaction.space.findFirst({
            where: { inviteCode: normalizedCode, deletedAt: null },
            select: {
              createdByUserId: true,
              id: true,
              inviteCodeExpiresAt: true,
              members: { where: { deletedAt: null }, select: { id: true } },
            },
          }),
          transaction.spaceMember.findFirst({
            where: { userId, deletedAt: null },
            select: { id: true },
          }),
        ]);

        if (!space?.inviteCodeExpiresAt) return { status: "unavailable" } as const;

        const isInviteExpired = space.inviteCodeExpiresAt <= new Date();
        const hasAvailableSlot = space.members.length === 1;
        const isSelfJoin = space.createdByUserId === userId;
        const isInviteUnavailable =
          isInviteExpired || !hasAvailableSlot || isSelfJoin || Boolean(existingMember);

        if (isInviteUnavailable) {
          return { status: "unavailable" } as const;
        }

        return { status: "valid" } as const;
      });

      const shouldRecordFailure = result.status === "malformed" || result.status === "unavailable";
      if (shouldRecordFailure) await this.joinAttempts.recordFailure(userId);

      return result;
    });
  }

  async join({ userId, accountName, inviteCode, displayName }: JoinParams): Promise<JoinResult> {
    return this.joinAttempts.withUserLock(userId, async () => {
      const lock = getActiveLock(await this.joinAttempts.getState(userId), new Date());
      if (lock) return lock;

      let result: JoinResult;

      try {
        result = await this.prisma.$transaction(async (transaction) => {
          const normalizedName = normalizeDisplayName(displayName, accountName);
          if (!normalizedName) return { status: "invalid_name" };

          const isCodeValid = isValidInviteCode(inviteCode);
          if (!isCodeValid) return { status: "malformed" };
          const normalizedCode = normalizeInviteCode(inviteCode);

          const spaces = await transaction.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM spaces WHERE invite_code = ${normalizedCode} AND deleted_at IS NULL FOR UPDATE
          `;
          const spaceId = spaces[0]?.id;
          const space = spaceId
            ? await transaction.space.findUnique({
                where: { id: spaceId },
                select: {
                  createdByUserId: true,
                  id: true,
                  inviteCodeExpiresAt: true,
                  members: { where: { deletedAt: null }, select: { id: true } },
                },
              })
            : null;

          if (!space?.inviteCodeExpiresAt) return { status: "unavailable" };

          const existingMember = await transaction.spaceMember.findFirst({
            where: { userId, deletedAt: null },
            select: { id: true },
          });

          const isInviteExpired = space.inviteCodeExpiresAt <= new Date();
          const hasAvailableSlot = space.members.length === 1;
          const isSelfJoin = space.createdByUserId === userId;
          const isInviteUnavailable =
            isInviteExpired || !hasAvailableSlot || isSelfJoin || Boolean(existingMember);

          if (isInviteUnavailable) {
            return { status: "unavailable" };
          }

          await Promise.all([
            transaction.spaceMember.create({
              data: {
                spaceId: space.id,
                userId,
                displayName: normalizedName,
                role: SpaceMemberRole.partner,
                onboardingCompletedAt: new Date(),
              },
            }),
            transaction.space.update({
              where: { id: space.id },
              data: { inviteCode: null, inviteCodeExpiresAt: null, updatedByUserId: userId },
            }),
          ]);

          return { status: "joined", space_id: space.id };
        });
      } catch (error) {
        const uniqueIndex = getUniqueIndex(error);
        const isMembershipConflict =
          uniqueIndex === ACTIVE_SPACE_MEMBER_INDEX || uniqueIndex === ACTIVE_SPACE_ROLE_INDEX;
        if (!isMembershipConflict) throw error;
        result = { status: "unavailable" };
      }

      if (result.status === "joined") {
        await this.joinAttempts.clear(userId);
        return result;
      }

      const shouldRecordFailure =
        result.status === "invalid_name" ||
        result.status === "malformed" ||
        result.status === "unavailable";

      if (shouldRecordFailure) {
        await this.joinAttempts.recordFailure(userId);
      }
      return result;
    });
  }
}

function getActiveLock(
  attempt: { failures: number; lockedUntil: Date | null },
  now: Date,
): Extract<JoinResult, { status: "locked" }> | null {
  if (attempt.lockedUntil) {
    return {
      status: "locked",
      retryAfter: Math.max(1, Math.ceil((attempt.lockedUntil.getTime() - now.getTime()) / 1000)),
    };
  }
  if (attempt.failures < JOIN_FAILURE_LIMIT) return null;
  return { status: "locked", retryAfter: JOIN_LOCK_SECONDS };
}
