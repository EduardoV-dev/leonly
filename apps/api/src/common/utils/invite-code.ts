import { randomInt } from "node:crypto";
import { INVITE_ALPHABET, INVITE_CODE_LENGTH, INVITE_PREFIXES } from "@leonly/utils/invite-code";
import { Prisma } from "../../generated/prisma/client";
import {
  ACTIVE_SPACE_MEMBER_INDEX,
  ACTIVE_SPACE_ROLE_INDEX,
} from "../../modules/memberships/constants/memberships.constants";
import {
  ACTIVE_INVITE_CODE_INDEX,
  INVITE_CODE_COLUMN,
  PRISMA_UNIQUE_CONSTRAINT_ERROR,
  USER_ID_COLUMN,
} from "../../modules/spaces/constants/spaces.constants";

export function generateInviteCode(): string {
  const prefix = INVITE_PREFIXES[randomInt(INVITE_PREFIXES.length)];
  return (
    prefix +
    Array.from(
      { length: INVITE_CODE_LENGTH },
      () => INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)],
    ).join("")
  );
}

export function getUniqueIndex(error: unknown): string | null {
  const isUniqueViolation =
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR;
  if (!isUniqueViolation) return null;

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
