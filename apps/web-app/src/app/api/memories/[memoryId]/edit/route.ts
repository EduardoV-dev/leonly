import { NextResponse } from "next/server";
import { z } from "zod";
import {
  EditMemoryError,
  editMemory,
  MemoryInputError,
} from "@/features/memories/server/edit-memory";
import { getAvailableMemory } from "@/features/memories/server/get-available-memory";
import { privateResourceNotFound } from "@/lib/private-resource-response";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const finalizeRequestSchema = z.object({ grant: z.string().min(1) }).strict();

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
    if (!user) return privateResourceNotFound();

    const { memoryId } = await context.params;
    if (!(await getAvailableMemory(memoryId))) return privateResourceNotFound();
    const payload = finalizeRequestSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return NextResponse.json(
        { code: "invalid_request", error: "Please reload this memory and try again." },
        { status: 400 },
      );
    }

    return NextResponse.json(await editMemory(memoryId, payload.data.grant, user.id));
  } catch (error) {
    if (error instanceof MemoryInputError) {
      if (error instanceof EditMemoryError && error.code === "unavailable") {
        return privateResourceNotFound();
      }
      if (error.status >= 500) {
        logServerError(
          { event: "memory_edit_failed", operation: "edit_memory" },
          error,
          requestLogger,
        );
      }
      return NextResponse.json(
        { code: error.code, error: error.message, fields: error.fields },
        { status: error.status },
      );
    }

    logServerError(
      { event: "memory_edit_failed", operation: "edit_memory" },
      new Error("Unexpected memory edit failure.", { cause: error }),
      requestLogger,
    );
    return NextResponse.json(
      { code: "memory_edit_failed", error: "We could not update this memory. Please try again." },
      { status: 500 },
    );
  }
}
