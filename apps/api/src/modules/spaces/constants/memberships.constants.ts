export const ACTIVE_SPACE_MEMBER_INDEX = "space_members_active_user_unique";
export const ACTIVE_SPACE_ROLE_INDEX = "space_members_active_space_role_unique";
export const JOIN_LOCK_MESSAGE = "Too many join attempts. Try again in 10 minutes.";
export const JOIN_RATE_LIMIT = {
  limit: 5,
  window: "10 m",
  strategy: "fixed-window",
  scope: "user",
  key: "join-attempts",
  message: JOIN_LOCK_MESSAGE,
} satisfies RateLimitOptions;

import type { RateLimitOptions } from "../../../common/rate-limit/rate-limit.decorator";
