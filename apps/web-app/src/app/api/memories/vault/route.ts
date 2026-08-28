import { NextResponse } from "next/server";
import { MAX_VAULT_CURSOR_LENGTH } from "@/features/memories/constants/vault";
import { getVaultPage } from "@/features/memories/server/get-vault-page";
import { createRequestLogger, logServerError } from "@/lib/server-logger";

export async function GET(request: Request) {
  try {
    const cursorValue = new URL(request.url).searchParams.get("cursor");
    const cursor =
      cursorValue && cursorValue.length > MAX_VAULT_CURSOR_LENGTH ? "invalid" : cursorValue;
    const page = await getVaultPage(cursor);
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
