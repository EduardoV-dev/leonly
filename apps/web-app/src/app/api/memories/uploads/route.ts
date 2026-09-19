import { NextResponse } from "next/server";
import {
  CreateMemoryError,
  cleanupResources,
  prepareMemoryCreation,
} from "@/features/memories/server/create-memory";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

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

    void Promise.resolve()
      .then(cleanupResources)
      .catch(() => undefined);
    const result = await prepareMemoryCreation(await request.formData(), user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CreateMemoryError) {
      if (error.status >= 500) {
        logServerError(
          { event: "memory_upload_prepare_failed", operation: "prepare_memory_uploads" },
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
      { event: "memory_upload_prepare_failed", operation: "prepare_memory_uploads" },
      error,
      requestLogger,
    );
    return NextResponse.json(
      { error: "We could not prepare these photos. Please try again." },
      { status: 500 },
    );
  }
}
