import { NextResponse } from "next/server";
import { getTimelinePage } from "@/features/memories/server/get-timeline-page";
import { createRequestLogger, logServerError } from "@/lib/server-logger";

export async function GET(request: Request) {
  try {
    const cursor = new URL(request.url).searchParams.get("cursor");
    return NextResponse.json(await getTimelinePage(cursor));
  } catch (error) {
    logServerError(
      { event: "memories_timeline_failed", operation: "get_timeline_page" },
      error,
      createRequestLogger(request),
    );
    return NextResponse.json(
      { error: "We could not load your memories. Please try again." },
      { status: 500 },
    );
  }
}
