import { NextResponse } from "next/server";
import { z } from "zod";

const spaceInviteResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("valid") }).strict(),
  z.object({ space_id: z.uuid(), status: z.literal("joined") }).strict(),
  z.object({ status: z.literal("malformed") }).strict(),
  z.object({ status: z.literal("unavailable") }).strict(),
  z.object({ status: z.literal("invalid_name") }).strict(),
  z.object({ retry_after: z.number().int().positive(), status: z.literal("locked") }).strict(),
]);

export const INVITE_UNAVAILABLE_MESSAGE = "This invite is invalid or unavailable.";
export const JOIN_RATE_LIMIT_MESSAGE = "Too many join attempts. Try again in 10 minutes.";

export function parseSpaceInviteResult(value: unknown) {
  return spaceInviteResultSchema.parse(value);
}

export function createLockedInviteResponse(retryAfter: number) {
  return NextResponse.json(
    { error: JOIN_RATE_LIMIT_MESSAGE },
    { headers: { "Retry-After": String(retryAfter) }, status: 429 },
  );
}
