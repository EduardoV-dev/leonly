import "server-only";

import { NextResponse } from "next/server";

const PRIVATE_RESOURCE_HEADERS = { "Cache-Control": "private, no-store" } as const;

export function privateResourceNotFound(): NextResponse {
  return NextResponse.json(
    { code: "not_found", error: "Resource not found." },
    { headers: PRIVATE_RESOURCE_HEADERS, status: 404 },
  );
}
