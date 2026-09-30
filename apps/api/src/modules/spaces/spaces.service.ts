import { randomInt } from "node:crypto";
import { retry } from "@leonly/utils";
import {
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_PREFIXES,
  isValidInviteCode,
  normalizeInviteCode,
} from "@leonly/utils/invite-code";
import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Prisma, SpaceMemberRole } from "../../generated/prisma/client";
import {
  ACTIVE_INVITE_CODE_INDEX,
  ACTIVE_SPACE_CONFLICT_MESSAGE,
  ACTIVE_SPACE_MEMBER_INDEX,
  ACTIVE_SPACE_ROLE_INDEX,
  INVITE_CODE_COLUMN,
  INVITE_CODE_TTL_MS,
  JOIN_FAILURE_LIMIT,
  JOIN_LOCK_SECONDS,
  MAX_INVITE_ATTEMPTS,
  PRISMA_UNIQUE_CONSTRAINT_ERROR,
  USER_ID_COLUMN,
} from "./constants/spaces.constants";
import { JoinAttemptRateLimiter } from "./join-attempt-rate-limiter";

type ValidateInviteParams = { userId: string; inviteCode: string };
type JoinParams = ValidateInviteParams & {
  accountName: string | undefined;
  displayName?: string | null;
};

type JoinResult =
  | { status: "joined"; space_id: string }
  | { status: "invalid_name" | "malformed" | "unavailable" }
  | { status: "locked"; retryAfter: number };

type CreateParams = {
  userId: string;
  accountName: string | undefined;
  details: { spaceName: string; displayName: string; startDate: Date };
};

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

@Injectable()
export class SpacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly joinAttempts: JoinAttemptRateLimiter,
  ) {}

  async getActiveSpace(userId: string): Promise<ActiveSpace | null> {
    const membership = await this.prisma.spaceMember.findFirst({
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
              take: 2,
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
    const member = await this.prisma.spaceMember.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });

    if (member) {
      throw new ConflictException({ error: ACTIVE_SPACE_CONFLICT_MESSAGE });
    }

    const name = normalizeDisplayName(details.displayName, accountName) ?? "Leonly User";

    try {
      const space = await retry(
        () =>
          this.prisma.space.create({
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

  async completeSetup(userId: string): Promise<boolean> {
    const result = await this.prisma.spaceMember.updateMany({
      where: { userId, deletedAt: null, space: { deletedAt: null } },
      data: { onboardingCompletedAt: new Date() },
    });

    return result.count > 0;
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

function normalizeDisplayName(
  value: string | null | undefined,
  accountName: string | undefined,
): string | null {
  const supplied = value?.trim() ?? "";
  const hasInvalidSuppliedName =
    Boolean(supplied) && (supplied.length < 2 || supplied.length > 100);
  if (hasInvalidSuppliedName) return null;
  const fallback = accountName?.trim() ?? "";
  return supplied || (fallback.length >= 2 && fallback.length <= 100 ? fallback : "Leonly User");
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

function generateInviteCode(): string {
  const prefix = INVITE_PREFIXES[randomInt(INVITE_PREFIXES.length)];
  return (
    prefix +
    Array.from(
      { length: INVITE_CODE_LENGTH },
      () => INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)],
    ).join("")
  );
}

function getUniqueIndex(error: unknown): string | null {
  const isUniqueViolation =
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR;

  if (!isUniqueViolation) {
    return null;
  }

  const target = error.meta?.target;

  if (typeof target === "string") return target;

  if (!Array.isArray(target)) return null;
  const isUserConstraint = target.length === 1 && target[0] === USER_ID_COLUMN;
  if (isUserConstraint) return ACTIVE_SPACE_MEMBER_INDEX;
  const isInviteConstraint = target.length === 1 && target[0] === INVITE_CODE_COLUMN;
  if (isInviteConstraint) return ACTIVE_INVITE_CODE_INDEX;
  const isRoleConstraint = target.includes("role") && target.includes("space_id");
  if (isRoleConstraint) return ACTIVE_SPACE_ROLE_INDEX;

  return null;
}
