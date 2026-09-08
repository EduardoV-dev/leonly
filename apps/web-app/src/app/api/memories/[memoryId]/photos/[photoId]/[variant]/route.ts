import { getMemoryPhoto } from "@/features/memories/server/get-memory-photo";
import { privateResourceNotFound } from "@/lib/private-resource-response";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const MEDIA_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Type": "image/webp",
  "X-Content-Type-Options": "nosniff",
} as const;

type RouteContext = {
  params: Promise<{ memoryId: string; photoId: string; variant: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return privateResourceNotFound();

    const { memoryId, photoId, variant } = await context.params;
    const photo = await getMemoryPhoto(memoryId, photoId, variant);
    if (!photo) return privateResourceNotFound();

    return new Response(photo, { headers: MEDIA_HEADERS });
  } catch (error) {
    logServerError(
      { event: "memory_photo_failed", operation: "get_memory_photo" },
      error,
      createRequestLogger(request),
    );
    return privateResourceNotFound();
  }
}
