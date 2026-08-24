import { z } from "zod";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import { MAX_TIMELINE_PAGE_SIZE } from "../constants/timeline";
import type { TimelineMemory, TimelinePage } from "../types/timeline";
import { getCoverPreviewUrl } from "./get-cover-preview-url";

const cursorSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.uuid(),
  memoryDate: z.string().date(),
  v: z.literal(1),
});

type TimelineCursor = z.infer<typeof cursorSchema>;

type TimelineRow = {
  created_at: string;
  description: string | null;
  id: string;
  location: string | null;
  memory_date: string;
  title: string;
};

function encodeCursor(memory: TimelineMemory): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: memory.createdAt,
      id: memory.id,
      memoryDate: memory.memoryDate,
      v: 1,
    }),
  ).toString("base64url");
}

function decodeCursor(cursor: string): TimelineCursor | null {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

async function toTimelineMemory(memory: TimelineRow): Promise<TimelineMemory> {
  return {
    coverPhotoUrl: await getCoverPreviewUrl(memory.id),
    createdAt: memory.created_at,
    description: memory.description,
    id: memory.id,
    location: memory.location,
    memoryDate: memory.memory_date,
    title: memory.title,
  };
}

function afterCursorFilter(cursor: TimelineCursor): string {
  return [
    `memory_date.lt.${cursor.memoryDate}`,
    `and(memory_date.eq.${cursor.memoryDate},created_at.lt.${cursor.createdAt})`,
    `and(memory_date.eq.${cursor.memoryDate},created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
  ].join(",");
}

async function isCurrentCursorAnchor(cursor: TimelineCursor, spaceId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select("id")
    .eq("id", cursor.id)
    .eq("space_id", spaceId)
    .eq("visibility", "timeline")
    .is("deleted_at", null)
    .eq("memory_date", cursor.memoryDate)
    .eq("created_at", cursor.createdAt)
    .maybeSingle();

  if (error) {
    logServerError(
      { event: "supabase_operation_failed", operation: "validate_timeline_cursor" },
      error,
    );
    throw new Error("Failed to load the memories timeline.");
  }

  return data !== null;
}

async function readTimelinePage(
  cursor: TimelineCursor | null,
  spaceId: string,
  pageSize: number,
): Promise<TimelinePage> {
  const supabase = await createClient();
  let query = supabase
    .from("memories")
    .select("id,title,description,location,memory_date,created_at")
    .eq("space_id", spaceId)
    .eq("visibility", "timeline")
    .is("deleted_at", null)
    .order("memory_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (cursor) {
    query = query.or(afterCursorFilter(cursor));
  }

  const { data, error } = await query.limit(pageSize + 1);

  if (error) {
    logServerError({ event: "supabase_operation_failed", operation: "get_timeline_page" }, error);
    throw new Error("Failed to load the memories timeline.");
  }

  const memories = await Promise.all(
    ((data ?? []) as TimelineRow[]).slice(0, pageSize).map(toTimelineMemory),
  );
  const hasNextPage = (data ?? []).length > pageSize;
  const lastMemory = memories.at(-1);

  return {
    cursorReset: false,
    memories,
    nextCursor: hasNextPage && lastMemory ? encodeCursor(lastMemory) : null,
  };
}

export async function getTimelinePage(
  cursorValue: string | null,
  pageSize = MAX_TIMELINE_PAGE_SIZE,
): Promise<TimelinePage> {
  const activeSpace = await getActiveSpaceForCurrentUser();

  if (!activeSpace) {
    throw new Error("No active space is available for the memories timeline.");
  }

  const cursor = cursorValue ? decodeCursor(cursorValue) : null;
  const shouldReset = cursorValue !== null && cursor === null;

  if (cursor && !(await isCurrentCursorAnchor(cursor, activeSpace.id))) {
    const firstPage = await readTimelinePage(null, activeSpace.id, pageSize);
    return { ...firstPage, cursorReset: true };
  }

  const page = await readTimelinePage(cursor, activeSpace.id, pageSize);
  return shouldReset ? { ...page, cursorReset: true } : page;
}

export const timelineCursor = { decode: decodeCursor, encode: encodeCursor };
