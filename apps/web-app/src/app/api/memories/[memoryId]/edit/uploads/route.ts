import { NextResponse } from "next/server";
import {
  cleanupStaleMemoryEdits,
  EditMemoryError,
  MemoryInputError,
  prepareMemoryEdit,
} from "@/features/memories/server/edit-memory";
import { getAvailableMemory } from "@/features/memories/server/get-available-memory";
import { privateResourceNotFound } from "@/lib/private-resource-response";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ memoryId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestLogger = createRequestLogger(request);
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return privateResourceNotFound();

    const { memoryId } = await context.params;
    if (!(await getAvailableMemory(memoryId))) return privateResourceNotFound();

    void Promise.resolve()
      .then(cleanupStaleMemoryEdits)
      .catch(() => undefined);
    const result = await prepareMemoryEdit(
      memoryId,
      request.headers.get("Idempotency-Key") ?? "",
      await request.formData(),
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MemoryInputError) {
      if (error instanceof EditMemoryError && error.code === "unavailable") {
        return privateResourceNotFound();
      }
      if (error.status >= 500) {
        logServerError(
          { event: "memory_edit_upload_prepare_failed", operation: "prepare_memory_edit_uploads" },
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
      { event: "memory_edit_upload_prepare_failed", operation: "prepare_memory_edit_uploads" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not prepare these photos. Please try again." },
      { status: 500 },
    );
  }
}
