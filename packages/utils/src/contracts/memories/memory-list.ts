import { z } from "zod";
import { baseCursorSchema } from "../cursor";
import type { MemoryReactionSummary } from "./memory-reaction";

export const memoryCursorSchema = baseCursorSchema.extend({
  memoryDate: z.iso.date().refine((value) => !value.startsWith("0000-")),
  sort: z.enum(["newest", "oldest"]),
});

export type MemoryCursor = z.infer<typeof memoryCursorSchema>;

export type MemoryListItem = {
  id: string;
  title: string;
  memoryDate: string;
  createdAt: string;
  description: string | null;
  location: string | null;
  coverPhotoUrl: string | null;
  reaction?: MemoryReactionSummary;
};

export type MemoryListPage = {
  data: MemoryListItem[];
  meta: {
    nextCursor: string | null;
    cursorReset: boolean;
  };
};
