import { type CustomDecorator, SetMetadata } from "@nestjs/common";

export const SKIP_RATE_LIMIT_KEY = "skip-rate-limit";

export const SkipRateLimit = (): CustomDecorator<string> => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
