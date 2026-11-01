import { type CustomDecorator, SetMetadata } from "@nestjs/common";
import { RATE_LIMIT_KEY } from "../constants/rate-limit.constants";
import type { RateLimitOptions } from "../types/rate-limit.types";

export const RateLimit = (policy: RateLimitOptions): CustomDecorator<string> =>
  SetMetadata(RATE_LIMIT_KEY, policy);
