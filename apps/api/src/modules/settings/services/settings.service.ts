import { Injectable } from "@nestjs/common";
import { POSTGRES_TIMESTAMP_FORMAT } from "../../../common/constants/timestamp.constants";
import { PrismaService } from "../../../common/prisma/prisma.service";
import type { SettingsMember, SettingsReadModel } from "../settings.types";

type SettingsRow = SettingsMember & {
  spaceName: string;
  startDate: string;
  spaceUpdatedAt: string;
  inviteCode: string | null;
  inviteExpiresAt: Date | null;
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string): Promise<SettingsReadModel | null> {
    const [members, account] = await Promise.all([
      this.prisma.$queryRaw<SettingsRow[]>`
        SELECT m.id, m.display_name AS "displayName", m.role,
          u.image AS "avatarUrl", m.id = c.id AS "isCurrentMember",
          to_char(m.created_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "joinedAt",
          to_char(m.updated_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "updatedAt",
          s.name AS "spaceName", s.start_date::text AS "startDate",
          to_char(s.updated_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "spaceUpdatedAt",
          s.invite_code AS "inviteCode", s.invite_code_expires_at AS "inviteExpiresAt"
        FROM space_members c
        JOIN spaces s ON s.id = c.space_id AND s.deleted_at IS NULL
        JOIN space_members m ON m.space_id = s.id AND m.deleted_at IS NULL
        JOIN "user" u ON u.id = m.user_id
        WHERE c.user_id = ${userId} AND c.deleted_at IS NULL
        ORDER BY m.role, m.created_at
      `,
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, accounts: { select: { providerId: true } } },
      }),
    ]);
    const space = members[0];
    if (!space) return null;
    const currentMembers = members.filter((member) => member.isCurrentMember);
    const hasInvalidSettingsContext = members.length > 2 || currentMembers.length !== 1 || !account;
    if (hasInvalidSettingsContext) {
      throw new Error("Settings requires one active space and a current account.");
    }
    const isSingleMember = members.length === 1;
    const code = isSingleMember ? space.inviteCode : null;
    const expiresAt = isSingleMember ? (space.inviteExpiresAt?.toISOString() ?? null) : null;
    return {
      account: {
        email: account.email,
        providerLabel: account.accounts.some(({ providerId }) => providerId === "google")
          ? "Google"
          : null,
      },
      activeMembers: members.map((member) => ({
        avatarUrl: member.avatarUrl,
        displayName: member.displayName,
        id: member.id,
        isCurrentMember: member.isCurrentMember,
        joinedAt: member.joinedAt,
        role: member.role,
        updatedAt: member.updatedAt,
      })),
      invite: {
        code,
        expiresAt,
        isAvailable: Boolean(code && expiresAt && Date.parse(expiresAt) > Date.now()),
      },
      membershipState: isSingleMember ? "one-member" : "two-member",
      space: { name: space.spaceName, startDate: space.startDate, updatedAt: space.spaceUpdatedAt },
    };
  }
}
