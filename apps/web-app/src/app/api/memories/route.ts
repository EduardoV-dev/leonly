import { NextResponse } from "next/server";
import { z } from "zod";
import { CreateMemoryError, createMemory } from "@/features/memories/server/create-memory";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const finalizeRequestSchema = z.object({ grant: z.string().min(1) }).strict();

export async function POST(request: Request) {
  const requestLogger = createRequestLogger(request);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "This memory is unavailable." }, { status: 404 });
    }

    const payload = finalizeRequestSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return NextResponse.json(
        { code: "invalid_request", error: "Please try again with a new form." },
        { status: 400 },
      );
    }
    const memory = await createMemory(payload.data.grant, user.id);
    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    if (error instanceof CreateMemoryError) {
      if (error.status >= 500) {
        logServerError(
          { event: "memory_creation_failed", operation: "create_memory" },
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
      { event: "memory_creation_failed", operation: "create_memory" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { code: "memory_create_failed", error: "We could not save this memory. Please try again." },
      { status: 500 },
    );
  }
}
