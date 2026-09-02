import { NextResponse } from "next/server";
import { z } from "zod";
import { decodeMemoryVersion } from "@/features/memories/server/memory-version";
import {
  MemoryPlacementError,
  MemoryPlacementInputError,
  placeMemory,
} from "@/features/memories/server/place-memory";
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
      return NextResponse.json({ error: "This memory is unavailable." }, { status: 404 });
    }

    const { memoryId } = await context.params;
    if (!memoryIdSchema.safeParse(memoryId).success) {
      return NextResponse.json(
        { code: "unavailable", error: "This memory is unavailable." },
        { status: 404 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Please reload this memory and try again." },
        { status: 400 },
      );
    }
    const payload = placementRequestSchema.safeParse(body);
    if (!payload.success) {
      return NextResponse.json(
        { error: "Please reload this memory and try again." },
        { status: 400 },
      );
    }

    const result = await placeMemory(
      user.id,
      memoryId,
      payload.data.targetVisibility,
      payload.data.expectedVersion,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MemoryPlacementError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof MemoryPlacementInputError) {
      return NextResponse.json(
        { error: "Please reload this memory and try again." },
        { status: 400 },
      );
    }

    logServerError(
      { event: "memory_placement_failed", operation: "place_memory" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not move this memory. Please try again." },
      { status: 500 },
    );
  }
}
