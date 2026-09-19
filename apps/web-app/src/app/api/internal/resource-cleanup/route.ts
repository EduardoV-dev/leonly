import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ENVIRONMENT_VARIABLES } from "@/constants/environment-variables";
import {
  cleanupResources,
  reapExpiredTemporaryMemoryObjects,
} from "@/features/memories/server/resource-cleanup";
import { createRequestLogger, logServerError } from "@/lib/server-logger";

function isAuthorized(authorization: string | null): boolean {
  const secret = ENVIRONMENT_VARIABLES.CRON_SECRET;
  if (!secret || !authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const requestLogger = createRequestLogger(request);
  try {
    await reapExpiredTemporaryMemoryObjects();
    await cleanupResources();
    return new Response(null, { status: 204 });
  } catch (error) {
    logServerError(
      { event: "resource_cleanup_failed", operation: "scheduled_resource_cleanup" },
      error,
      requestLogger,
    );
    return NextResponse.json({ error: "Cleanup failed." }, { status: 500 });
  }
}
