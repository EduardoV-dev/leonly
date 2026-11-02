import type { RateLimitOptions } from "../../../common/rate-limit/types/rate-limit.types";

export const INVITE_CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_INVITE_ATTEMPTS = 5;
export const ACTIVE_SPACE_CONFLICT_MESSAGE = "You already belong to an active space.";
export const ACTIVE_INVITE_CODE_INDEX = "spaces_active_invite_code_unique";
export const USER_ID_COLUMN = "user_id";
export const INVITE_CODE_COLUMN = "invite_code";
export const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";

export const INVITE_REGENERATION_RATE_LIMIT = {
  limit: 5,
  window: "10 m",
  strategy: "fixed-window",
  scope: "user",
  key: "invite-regeneration",
  message: "Too many invite requests. Try again in 10 minutes.",
} satisfies RateLimitOptions;

export const SPACE_CREATION_RATE_LIMIT = {
  limit: 5,
  window: "10 m",
  strategy: "fixed-window",
  scope: "user",
} satisfies RateLimitOptions;

export const MIN_DISPLAY_NAME_LENGTH = 2;
export const MAX_DISPLAY_NAME_LENGTH = 100;
export const MIN_SPACE_NAME_LENGTH = 2;
export const MAX_SPACE_NAME_LENGTH = 100;
export const DEFAULT_DISPLAY_NAME = "Leonly User";
export const MAX_SPACE_MEMBERS = 2;
