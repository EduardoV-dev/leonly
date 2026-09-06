import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_MEMORY_SORT,
  MEMORY_SORT_OPTIONS,
} from "@/features/memories/constants/memory-sort";
import { MAX_VAULT_CURSOR_LENGTH } from "@/features/memories/constants/vault";
import { getVaultPage } from "@/features/memories/server/get-vault-page";
import { createRequestLogger, logServerError } from "@/lib/server-logger";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const cursorValue = searchParams.get("cursor");
    const sortResult = z.enum(MEMORY_SORT_OPTIONS).safeParse(searchParams.get("sort"));
    const cursor =
      cursorValue && cursorValue.length > MAX_VAULT_CURSOR_LENGTH ? "invalid" : cursorValue;
    if (searchParams.has("sort") && !sortResult.success) {
      return NextResponse.json({ error: "Choose a valid memory sort." }, { status: 400 });
    }
    const sort = sortResult.success ? sortResult.data : DEFAULT_MEMORY_SORT;
    const page = await getVaultPage(cursor, sort);
    return NextResponse.json(page);
  } catch (error) {
    logServerError(
      { event: "private_vault_failed", operation: "get_vault_page" },
      error,
      createRequestLogger(request),
    );
    return NextResponse.json(
      { error: "We could not load the Private Vault. Please try again." },
      { status: 500 },
    );
  }
}
