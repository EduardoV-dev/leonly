import { randomInt } from "node:crypto";
import { retry } from "@leonly/utils";
import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Prisma, SpaceMemberRole } from "../../generated/prisma/client";

const INVITE_PREFIXES = ["leo", "lov", "mem", "our", "duo", "two", "joy", "sun", "lny"];
const INVITE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const INVITE_CODE_LENGTH = 5;
const INVITE_CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_INVITE_ATTEMPTS = 5;
const ACTIVE_SPACE_CONFLICT_MESSAGE = "You already belong to an active space.";
const ACTIVE_SPACE_MEMBER_INDEX = "space_members_active_user_unique";
const ACTIVE_INVITE_CODE_INDEX = "spaces_active_invite_code_unique";
const USER_ID_COLUMN = "user_id";
const INVITE_CODE_COLUMN = "invite_code";
const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";

type CreateParams = {
  userId: string;
  accountName: string | undefined;
  details: { spaceName: string; displayName: string; startDate: Date };
};

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) { }

  async create({
    userId,
    accountName,
    details,
  }: CreateParams): Promise<{ space_id: string }> {
    const member = await this.prisma.spaceMember.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });

    if (member) {
      throw new ConflictException({ error: ACTIVE_SPACE_CONFLICT_MESSAGE });
    }

    const name = details.displayName || accountName?.trim() || "";

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
                  onboardingCompletedAt: new Date(),
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

  if (Array.isArray(target) && target.length === 1) {
    if (target[0] === USER_ID_COLUMN) return ACTIVE_SPACE_MEMBER_INDEX;
    if (target[0] === INVITE_CODE_COLUMN) return ACTIVE_INVITE_CODE_INDEX;
  }

  return null;
}
