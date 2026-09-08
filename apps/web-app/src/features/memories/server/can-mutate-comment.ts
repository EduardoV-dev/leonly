import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function canMutateComment(memoryId: string, commentId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("can_mutate_memory_comment", {
    p_comment_id: commentId,
    p_memory_id: memoryId,
  });

  return !error && data === true;
}
