import { Prisma, SpaceMemberRole } from "@leonly/database/client";
import { retry } from "@leonly/utils";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { POSTGRES_TIMESTAMP_FORMAT } from "../../../common/constants/timestamp.constants";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { ACTIVE_SPACE_MEMBER_INDEX } from "../constants/memberships.constants";
import {
  ACTIVE_INVITE_CODE_INDEX,
  ACTIVE_SPACE_CONFLICT_MESSAGE,
  DEFAULT_DISPLAY_NAME,
  INVITE_CODE_TTL_MS,
  MAX_INVITE_ATTEMPTS,
  MAX_SPACE_MEMBERS,
} from "../constants/spaces.constants";
import type { SpaceEditOptions, SpaceEditResult } from "../types/spaces.types";
import { normalizeDisplayName } from "../utils/display-name";
import { generateInviteCode, getUniqueIndex } from "../utils/invite-code";

type CreateParams = {
  userId: string;
  accountName: string | undefined;
  details: { spaceName: string; displayName: string; startDate: Date };
};

type UpdateNameParams = SpaceEditOptions & { name: string };
type UpdateStartDateParams = SpaceEditOptions & { startDate: string };
type UpdateSpaceParams = SpaceEditOptions & { field: "name" | "startDate"; value: string };

type ActiveSpace = {
  active_members: { avatar_url: string | null; display_name: string }[];
  id: string;
  invite_code: string | null;
  invite_code_expires_at: string | null;
  member_names: string[];
  name: string;
  onboarding_completed_at: string | null;
  start_date: string;
};

const getColumnConfigs = (value: string) =>
  Object.freeze({
    name: {
      column: Prisma.sql`name`,
      transformation: Prisma.sql`${value}`,
    },
    startDate: {
      column: Prisma.sql`start_date`,
      transformation: Prisma.sql`${value}::date`,
    },
  });

@Injectable()
export class SpacesService {
  constructor(private readonly prismaService: PrismaService) {}

  async updateName({
    userId,
    lastKnownUpdatedAt,
    name,
  }: UpdateNameParams): Promise<SpaceEditResult> {
    return await this.updateSpace({ userId, lastKnownUpdatedAt, field: "name", value: name });
  }

  async updateStartDate({
    userId,
    lastKnownUpdatedAt,
    startDate,
  }: UpdateStartDateParams): Promise<SpaceEditResult> {
    return await this.updateSpace({
      userId,
      lastKnownUpdatedAt,
      field: "startDate",
      value: startDate,
    });
  }

  private async updateSpace({
    userId,
    field,
    value,
    lastKnownUpdatedAt,
  }: UpdateSpaceParams): Promise<SpaceEditResult> {
    const rows = await this.prismaService.$queryRaw<Array<{ spaceId: string }>>`
        SELECT s.id AS "spaceId"
        FROM space_members c JOIN spaces s ON s.id = c.space_id
        WHERE c.user_id = ${userId} AND c.deleted_at IS NULL AND s.deleted_at IS NULL
      `;

    const current = rows[0];
    if (!current) throw new NotFoundException({ error: "This shared space is unavailable." });

    const config = getColumnConfigs(value)[field];

    const updated = await this.prismaService.$queryRaw<Array<{ updatedAt: string }>>`
        UPDATE spaces SET ${config.column} = ${config.transformation},
          updated_by_user_id = ${userId}
        WHERE id = ${current.spaceId}::uuid AND updated_at = ${lastKnownUpdatedAt}::timestamptz
          AND deleted_at IS NULL AND EXISTS (
            SELECT 1 FROM space_members c WHERE c.space_id = spaces.id
              AND c.user_id = ${userId} AND c.deleted_at IS NULL
          )
        RETURNING to_char(updated_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "updatedAt"
      `;

    const revision = updated[0]?.updatedAt;
    if (!revision) throw new ConflictException();

    return { [field]: value, status: "updated", updatedAt: revision } as SpaceEditResult;
  }

  async getActiveSpace(userId: string): Promise<ActiveSpace | null> {
    const membership = await this.prismaService.spaceMember.findFirst({
      where: { userId, deletedAt: null, space: { deletedAt: null } },
      select: {
        onboardingCompletedAt: true,
        space: {
          select: {
            id: true,
            inviteCode: true,
            inviteCodeExpiresAt: true,
            members: {
              where: { deletedAt: null },
              orderBy: { createdAt: "asc" },
              take: MAX_SPACE_MEMBERS,
              select: {
                displayName: true,
                user: { select: { image: true } },
              },
            },
            name: true,
            startDate: true,
          },
        },
      },
    });

    if (!membership) return null;

    const { space } = membership;
    const activeMembers = space.members.map(({ displayName, user }) => ({
      avatar_url: user.image,
      display_name: displayName,
    }));

    return {
      active_members: activeMembers,
      id: space.id,
      invite_code: space.inviteCode,
      invite_code_expires_at: space.inviteCodeExpiresAt?.toISOString() ?? null,
      member_names: activeMembers.map(({ display_name }) => display_name),
      name: space.name,
      onboarding_completed_at: membership.onboardingCompletedAt?.toISOString() ?? null,
      start_date: space.startDate.toISOString().slice(0, 10),
    };
  }

  async create({ userId, accountName, details }: CreateParams): Promise<{ space_id: string }> {
    const member = await this.prismaService.spaceMember.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });

    if (member) {
      throw new ConflictException({ error: ACTIVE_SPACE_CONFLICT_MESSAGE });
    }

    const name =
      normalizeDisplayName({ value: details.displayName, accountName }) ?? DEFAULT_DISPLAY_NAME;

    try {
      const space = await retry(
        () =>
          this.prismaService.space.create({
            data: {
              name: details.spaceName,
              startDate: details.startDate,
              inviteCode: generateInviteCode(),
              inviteCodeExpiresAt: new Date(Date.now() + INVITE_CODE_TTL_MS),
              createdByUserId: userId,
              updatedByUserId: userId,
              members: {
                create: {
                  userId,
                  displayName: name,
                  role: SpaceMemberRole.owner,
                  onboardingCompletedAt: null,
                },
              },
            },
            select: { id: true },
          }),
        {
          maxAttempts: MAX_INVITE_ATTEMPTS,
          shouldRetry: (error) => getUniqueIndex(error) === ACTIVE_INVITE_CODE_INDEX,
        },
      );
      return { space_id: space.id };
    } catch (error) {
      if (getUniqueIndex(error) === ACTIVE_SPACE_MEMBER_INDEX) {
        throw new ConflictException({ error: ACTIVE_SPACE_CONFLICT_MESSAGE });
      }

      throw error;
    }
  }
}
