import { NextResponse } from "next/server";
import {
  cleanupResources,
  EditMemoryError,
  MemoryInputError,
  prepareMemoryEdit,
} from "@/features/memories/server/edit-memory";
import { getAvailableMemory } from "@/features/memories/server/get-available-memory";
import { privateResourceNotFound } from "@/lib/private-resource-response";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ memoryId: string }> };

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
  if (!request.body) return request.formData();

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
      .then(cleanupResources)
      .catch(() => undefined);
    const result = await prepareMemoryEdit(memoryId, await readBoundedFormData(request), user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof EditPayloadTooLargeError) {
      return NextResponse.json(
        {
          code: "payload_too_large",
          error: "The edit request is too large.",
          fields: { photos: "Choose smaller photos." },
        },
        { status: 413 },
      );
    }
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
