import { NextResponse } from "next/server";
import {
  cleanupStaleMemoryEdits,
  EditMemoryError,
  editMemory,
  MemoryInputError,
} from "@/features/memories/server/edit-memory";
import { getAvailableMemory } from "@/features/memories/server/get-available-memory";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const MAX_EDIT_MULTIPART_BYTES = 27 * 1024 * 1024;

class EditPayloadTooLargeError extends Error {}

async function readBoundedFormData(request: Request): Promise<FormData> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_EDIT_MULTIPART_BYTES
  ) {
    throw new EditPayloadTooLargeError();
  }
  if (!request.body) {
    return request.formData();
  }

  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_EDIT_MULTIPART_BYTES) {
        await reader.cancel();
        throw new EditPayloadTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(body.buffer, {
    headers: { "content-type": request.headers.get("content-type") ?? "" },
  }).formData();
}

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
    if (!(await getAvailableMemory(memoryId))) {
      return NextResponse.json(
        { code: "unavailable", error: "This memory is unavailable." },
        { status: 404 },
      );
    }
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
    const formData = await readBoundedFormData(request);
    void Promise.resolve()
      .then(cleanupStaleMemoryEdits)
      .catch(() => undefined);

    const result = await editMemory(user.id, memoryId, idempotencyKey, formData);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof EditPayloadTooLargeError) {
      return NextResponse.json(
        { error: "The edit request is too large.", fields: { photos: "Choose smaller photos." } },
        { status: 413 },
      );
    }
    if (error instanceof MemoryInputError) {
      if (error.status >= 500) {
        logServerError(
          { event: "memory_edit_failed", operation: "edit_memory" },
          error,
          requestLogger,
        );
      }
      return NextResponse.json(
        {
          code: error instanceof EditMemoryError ? error.code : undefined,
          error: error.message,
          fields: error.fields,
        },
        { status: error.status },
      );
    }

    logServerError(
      { event: "memory_edit_failed", operation: "edit_memory" },
      new Error("Unexpected memory edit failure."),
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not update this memory. Please try again." },
      { status: 500 },
    );
  }
}
