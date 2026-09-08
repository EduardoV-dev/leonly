import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteMemory,
  MemoryDeletionError,
  MemoryDeletionInputError,
} from "@/features/memories/server/delete-memory";
import { getAvailableMemory } from "@/features/memories/server/get-available-memory";
import { decodeMemoryVersion } from "@/features/memories/server/memory-version";
import { privateResourceNotFound } from "@/lib/private-resource-response";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const MAX_DELETE_JSON_BYTES = 1024;
const DETAIL_READ_HEADERS = { "Cache-Control": "private, no-store" } as const;
const deletionRequestSchema = z
  .object({ expectedVersion: z.string().refine((value) => decodeMemoryVersion(value) !== null) })
  .strict();

class DeletePayloadTooLargeError extends Error {}

type RouteContext = {
  params: Promise<{ memoryId: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return privateResourceNotFound();

    const { memoryId } = await context.params;
    const memory = await getAvailableMemory(memoryId);
    return memory
      ? new Response(null, { headers: DETAIL_READ_HEADERS, status: 204 })
      : privateResourceNotFound();
  } catch {
    logServerError(
      { event: "memory_availability_failed", operation: "get_available_memory" },
      new Error("Unexpected memory availability failure."),
      createRequestLogger(request),
    );
    return NextResponse.json(
      {
        code: "memory_availability_failed",
        error: "We could not check this memory. Please try again.",
      },
      { headers: DETAIL_READ_HEADERS, status: 500 },
    );
  }
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_DELETE_JSON_BYTES
  ) {
    throw new DeletePayloadTooLargeError();
  }

  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_DELETE_JSON_BYTES) {
        await reader.cancel();
        throw new DeletePayloadTooLargeError();
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
  return JSON.parse(new TextDecoder().decode(body));
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const requestLogger = createRequestLogger(request);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return privateResourceNotFound();

    const { memoryId } = await context.params;
    if (!(await getAvailableMemory(memoryId))) return privateResourceNotFound();

    const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/json") {
      return NextResponse.json(
        { code: "invalid_request", error: "Use an application/json request body." },
        { status: 415 },
      );
    }

    let body: unknown;
    try {
      body = await readBoundedJson(request);
    } catch (error) {
      if (error instanceof DeletePayloadTooLargeError) throw error;
      return NextResponse.json(
        { code: "invalid_request", error: "Please reload this memory and try again." },
        { status: 400 },
      );
    }

    const payload = deletionRequestSchema.safeParse(body);
    if (!payload.success) {
      return NextResponse.json(
        { code: "invalid_request", error: "Please reload this memory and try again." },
        { status: 400 },
      );
    }

    await deleteMemory(memoryId, payload.data.expectedVersion);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof DeletePayloadTooLargeError) {
      return NextResponse.json(
        { code: "payload_too_large", error: "The deletion request is too large." },
        { status: 413 },
      );
    }
    if (error instanceof MemoryDeletionError) {
      if (error.code === "unavailable") return privateResourceNotFound();
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof MemoryDeletionInputError) {
      return NextResponse.json(
        { code: "invalid_request", error: "Please reload this memory and try again." },
        { status: 400 },
      );
    }

    logServerError(
      { event: "memory_deletion_failed", operation: "delete_memory" },
      new Error("Unexpected memory deletion failure."),
      requestLogger,
    );
    return NextResponse.json(
      { code: "memory_delete_failed", error: "We could not delete this memory. Please try again." },
      { status: 500 },
    );
  }
}
