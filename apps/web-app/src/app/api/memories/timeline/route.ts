import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_MEMORY_SORT,
  MEMORY_SORT_OPTIONS,
} from "@/features/memories/constants/memory-sort";
import { MAX_TIMELINE_PAGE_SIZE } from "@/features/memories/constants/timeline";
import { getTimelinePage } from "@/features/memories/server/get-timeline-page";
import { createRequestLogger, logServerError } from "@/lib/server-logger";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const cursor = searchParams.get("cursor");
    const limitValue = searchParams.get("limit");
    const sortResult = z.enum(MEMORY_SORT_OPTIONS).safeParse(searchParams.get("sort"));
    const limitResult = z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_TIMELINE_PAGE_SIZE)
      .safeParse(limitValue);

    if (limitValue !== null && !limitResult.success) {
      return NextResponse.json({ error: "Choose a valid timeline limit." }, { status: 400 });
    }
    if (searchParams.has("sort") && !sortResult.success) {
      return NextResponse.json({ error: "Choose a valid memory sort." }, { status: 400 });
    }

    const sort = sortResult.success ? sortResult.data : DEFAULT_MEMORY_SORT;
    const page =
      limitValue === null
        ? await getTimelinePage(cursor, undefined, sort)
        : await getTimelinePage(cursor, limitResult.data, sort);
    return NextResponse.json(page);
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
