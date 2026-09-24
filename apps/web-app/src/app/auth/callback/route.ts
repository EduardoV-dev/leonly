import { NextResponse } from "next/server";
import { APP_ROUTES } from "@/constants/routes";

export function GET(request: Request) {
  return NextResponse.redirect(new URL(APP_ROUTES.AUTH, request.url));
}
