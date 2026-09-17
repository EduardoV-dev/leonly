import { cache } from "react";
import { z } from "zod";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const activeSpaceSchema = z
  .object({
    active_members: z
      .array(
        z
          .object({
            avatar_url: z.string().nullable(),
            display_name: z.string().min(1),
          })
          .strict(),
      )
      .min(1)
      .max(2),
    id: z.uuid(),
    invite_code: z.string().min(1).nullable(),
    invite_code_expires_at: z.string().datetime({ offset: true }).nullable(),
    member_names: z.array(z.string().min(1)).min(1).max(2),
    name: z.string().min(1),
    onboarding_completed_at: z.string().datetime({ offset: true }).nullable(),
    start_date: z.iso.date(),
  })
  .strict();

export type ActiveSpace = z.infer<typeof activeSpaceSchema>;

export const getActiveSpaceForCurrentUser = cache(async (): Promise<ActiveSpace | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_active_space");

  if (error) {
    logServerError({ event: "supabase_operation_failed", operation: "get_active_space" }, error);
    throw new Error("Failed to load the active space.");
  }

  if (data === null) return null;

  const parsedSpace = activeSpaceSchema.safeParse(data);
  if (!parsedSpace.success) {
    logServerError(
      { event: "supabase_operation_failed", operation: "parse_active_space" },
      parsedSpace.error,
    );
    throw new Error("Failed to load the active space.");
  }

  return parsedSpace.data;
});
