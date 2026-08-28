import "server-only";

import { z } from "zod";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import { MAX_VAULT_PAGE_SIZE } from "../constants/vault";
import type { VaultMemory, VaultPage } from "../types/vault";
import { getCoverPreviewUrl } from "./get-cover-preview-url";

const vaultCursorSchema = z
  .object({
    createdAt: z.string().datetime({ offset: true }),
    id: z.uuid(),
    memoryDate: z.string().date(),
    v: z.literal(1),
  })
  .strict();

type VaultCursor = z.infer<typeof vaultCursorSchema>;

type VaultRow = {
  created_at: string;
  description: string | null;
  id: string;
  location: string | null;
  memory_date: string;
  title: string;
};

function encodeCursor(memory: VaultMemory): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: memory.createdAt,
      id: memory.id,
      memoryDate: memory.memoryDate,
      v: 1,
    }),
  ).toString("base64url");
}

function decodeCursor(cursor: string): VaultCursor | null {
  try {
    return vaultCursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

function afterCursorFilter(cursor: VaultCursor): string {
  return [
    `memory_date.lt.${cursor.memoryDate}`,
    `and(memory_date.eq.${cursor.memoryDate},created_at.lt.${cursor.createdAt})`,
    `and(memory_date.eq.${cursor.memoryDate},created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
  ].join(",");
}

async function toVaultMemory(memory: VaultRow): Promise<VaultMemory> {
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

async function isCurrentCursorAnchor(cursor: VaultCursor, spaceId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select("id")
    .eq("id", cursor.id)
    .eq("space_id", spaceId)
    .eq("visibility", "vault")
    .is("deleted_at", null)
    .eq("memory_date", cursor.memoryDate)
    .eq("created_at", cursor.createdAt)
    .maybeSingle();

  if (error) {
    logServerError(
      { event: "supabase_operation_failed", operation: "validate_vault_cursor" },
      error,
    );
    throw new Error("Failed to load the Private Vault.");
  }

  return data !== null;
}

async function readVaultPage(
  cursor: VaultCursor | null,
  spaceId: string,
  pageSize: number,
): Promise<VaultPage> {
  const supabase = await createClient();
  let query = supabase
    .from("memories")
    .select("id,title,description,location,memory_date,created_at")
    .eq("space_id", spaceId)
    .eq("visibility", "vault")
    .is("deleted_at", null)
    .order("memory_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (cursor) {
    query = query.or(afterCursorFilter(cursor));
  }

  const { data, error } = await query.limit(pageSize + 1);

  if (error) {
    logServerError({ event: "supabase_operation_failed", operation: "get_vault_page" }, error);
    throw new Error("Failed to load the Private Vault.");
  }

  const memories = await Promise.all(
    ((data ?? []) as VaultRow[]).slice(0, pageSize).map(toVaultMemory),
  );
  const lastMemory = memories.at(-1);

  return {
    cursorReset: false,
    memories,
    nextCursor: (data ?? []).length > pageSize && lastMemory ? encodeCursor(lastMemory) : null,
  };
}

export async function getVaultPage(cursorValue: string | null): Promise<VaultPage> {
  const activeSpace = await getActiveSpaceForCurrentUser();

  if (!activeSpace) {
    throw new Error("No active space is available for the Private Vault.");
  }

  const cursor = cursorValue ? decodeCursor(cursorValue) : null;
  const shouldReset = cursorValue !== null && cursor === null;

  if (cursor && !(await isCurrentCursorAnchor(cursor, activeSpace.id))) {
    const firstPage = await readVaultPage(null, activeSpace.id, MAX_VAULT_PAGE_SIZE);
    return { ...firstPage, cursorReset: true };
  }

  const page = await readVaultPage(cursor, activeSpace.id, MAX_VAULT_PAGE_SIZE);
  return shouldReset ? { ...page, cursorReset: true } : page;
}

export const vaultCursor = { decode: decodeCursor, encode: encodeCursor };
