import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APP_ROUTES } from "@/constants/routes";
import { api } from "@/lib/axios/api";

function hasSession(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;
  return response.session !== null && response.session !== undefined;
}

async function hasBetterAuthSession(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get("cookie");

  try {
    const response = await api.get<unknown>("/api/auth/get-session", {
      headers: {
        accept: "application/json",
        ...(cookie ? { cookie } : {}),
      },
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      return false;
    }

    return hasSession(response.data);
  } catch {
    return false;
  }
}

function isAuthRoute(pathname: string): boolean {
  return pathname === APP_ROUTES.AUTH || pathname.startsWith(`${APP_ROUTES.AUTH}/`);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isAuthenticated = await hasBetterAuthSession(request);
  const authRoute = isAuthRoute(pathname);

  if (!isAuthenticated && authRoute) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = APP_ROUTES.AUTH;
    url.search = "";

    return NextResponse.redirect(url);
  }

  if (authRoute) {
    return NextResponse.redirect(
      new URL(APP_ROUTES.WELCOME_CREATE_STEP("start"), request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
