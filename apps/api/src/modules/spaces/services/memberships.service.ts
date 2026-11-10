import { type Prisma, SpaceMemberRole } from "@leonly/database/client";
import { isValidInviteCode, normalizeInviteCode } from "@leonly/utils/invite-code";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { POSTGRES_TIMESTAMP_FORMAT } from "../../../common/constants/timestamp.constants";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  ACTIVE_SPACE_MEMBER_INDEX,
  ACTIVE_SPACE_ROLE_INDEX,
} from "../constants/memberships.constants";
import type {
  DisplayNameEditResult,
  JoinParams,
  JoinResult,
  ValidateInviteParams,
} from "../types/memberships.types";
import { normalizeDisplayName } from "../utils/display-name";
import { getUniqueIndex } from "../utils/invite-code";

type UpdateDisplayNameParams = { userId: string; displayName: string; lastKnownUpdatedAt: string };
type RequireActiveMembershipParams = {
  userId: string;
  transaction?: Prisma.TransactionClient;
  lock?: boolean;
};

@Injectable()
export class MembershipsService {
  constructor(private readonly prismaService: PrismaService) {}

  async requireActiveMembership({
    userId,
    transaction,
    lock = false,
  }: RequireActiveMembershipParams): Promise<{ id: string; spaceId: string }> {
    if (lock) {
      if (!transaction) throw new Error("A transaction is required to lock a membership.");
      const members = await transaction.$queryRaw<{ id: string; spaceId: string }[]>`
        SELECT sm.id, sm.space_id AS "spaceId" FROM space_members sm
        JOIN spaces s ON s.id = sm.space_id
        WHERE sm.user_id = ${userId} AND sm.deleted_at IS NULL AND s.deleted_at IS NULL
        FOR UPDATE OF sm, s
      `;
      const membership = members[0];
      if (!membership) throw new NotFoundException({ error: "An active space required." });
      return membership;
    }

    const membership = await (transaction ?? this.prismaService).spaceMember.findFirst({
      where: { userId, deletedAt: null, space: { deletedAt: null } },
      select: { id: true, spaceId: true },
    });

    if (!membership) throw new NotFoundException({ error: "An active space is required." });
    return membership;
  }

  async updateDisplayName({
    userId,
    displayName,
    lastKnownUpdatedAt,
  }: UpdateDisplayNameParams): Promise<DisplayNameEditResult> {
    const rows = await this.prismaService.$queryRaw<Array<{ memberId: string }>>`
        SELECT c.id AS "memberId"
        FROM space_members c JOIN spaces s ON s.id = c.space_id
        WHERE c.user_id = ${userId} AND c.deleted_at IS NULL AND s.deleted_at IS NULL
      `;
    const current = rows[0];

    if (!current) throw new NotFoundException({ error: "This shared space is unavailable." });

    const updated = await this.prismaService.$queryRaw<Array<{ updatedAt: string }>>`
        UPDATE space_members SET display_name = ${displayName}
        WHERE id = ${current.memberId}::uuid AND updated_at = ${lastKnownUpdatedAt}::timestamptz
          AND user_id = ${userId} AND deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM spaces s WHERE s.id = space_members.space_id AND s.deleted_at IS NULL)
        RETURNING to_char(updated_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "updatedAt"
      `;
    const revision = updated[0]?.updatedAt;

    if (!revision) throw new ConflictException();

    return {
      displayName,
      status: "updated",
      updatedAt: revision,
    };
  }

  async completeSetup(userId: string): Promise<{ completed: true }> {
    const result = await this.prismaService.spaceMember.updateMany({
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
    return this.prismaService.$transaction(async (transaction) => {
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
  }

  async join({ userId, accountName, inviteCode, displayName }: JoinParams): Promise<JoinResult> {
    try {
      return await this.prismaService.$transaction<JoinResult>(async (transaction) => {
        const normalizedName = normalizeDisplayName({ value: displayName, accountName });
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
      return { status: "unavailable" };
    }
  }
}
