import { NextResponse } from "next/server";
import {
  CreateMemoryError,
  cleanupStaleMemoryPhotoStaging,
  createMemory,
} from "@/features/memories/server/create-memory";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "This memory is unavailable." }, { status: 404 });
    }

    void Promise.resolve()
      .then(cleanupStaleMemoryPhotoStaging)
      .catch(() => undefined);
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
    const memory = await createMemory(user.id, idempotencyKey, await request.formData());
    return NextResponse.json(memory, { status: memory.reused ? 200 : 201 });
  } catch (error) {
    if (error instanceof CreateMemoryError) {
      return NextResponse.json(
        { error: error.message, fields: error.fields },
        { status: error.status },
      );
    }

    logServerError(
      { event: "memory_creation_failed", operation: "create_memory" },
      error,
      createRequestLogger(request),
    );
    return NextResponse.json(
      { error: "We could not save this memory. Please try again." },
      { status: 500 },
    );
  }
}
