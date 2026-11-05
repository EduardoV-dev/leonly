import { z } from "zod";
import { baseCursorSchema } from "./base-cursor";

export const memoryCursorSchema = baseCursorSchema.extend({
  memoryDate: z.iso.date().refine((value) => !value.startsWith("0000-")),
  sort: z.enum(["newest", "oldest"]),
});

export type MemoryCursor = z.infer<typeof memoryCursorSchema>;
