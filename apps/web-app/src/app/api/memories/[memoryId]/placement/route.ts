import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableMemory } from "@/features/memories/server/get-available-memory";
import { decodeMemoryVersion } from "@/features/memories/server/memory-version";
import {
  MemoryPlacementError,
  MemoryPlacementInputError,
  placeMemory,
} from "@/features/memories/server/place-memory";
import { privateResourceNotFound } from "@/lib/private-resource-response";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const placementRequestSchema = z
  .object({
    expectedVersion: z.string().refine((value) => decodeMemoryVersion(value) !== null),
    targetVisibility: z.enum(["timeline", "vault"]),
  })
  .strict();
const memoryIdSchema = z.uuid();

type RouteContext = {
  params: Promise<{ memoryId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const requestLogger = createRequestLogger(request);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return privateResourceNotFound();
    }

    const { memoryId } = await context.params;
    if (!memoryIdSchema.safeParse(memoryId).success) {
      return privateResourceNotFound();
    }
    if (!(await getAvailableMemory(memoryId))) return privateResourceNotFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { code: "invalid_request", error: "Please reload this memory and try again." },
        { status: 400 },
      );
    }
    const payload = placementRequestSchema.safeParse(body);
    if (!payload.success) {
      return NextResponse.json(
        { code: "invalid_request", error: "Please reload this memory and try again." },
        { status: 400 },
      );
    }

    const result = await placeMemory(
      memoryId,
      payload.data.targetVisibility,
      payload.data.expectedVersion,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MemoryPlacementError) {
      if (error.code === "unavailable") return privateResourceNotFound();
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof MemoryPlacementInputError) {
      return NextResponse.json(
        { code: "invalid_request", error: "Please reload this memory and try again." },
        { status: 400 },
      );
    }

    logServerError(
      { event: "memory_placement_failed", operation: "place_memory" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      {
        code: "memory_placement_failed",
        error: "We could not move this memory. Please try again.",
      },
      { status: 500 },
    );
  }
}
