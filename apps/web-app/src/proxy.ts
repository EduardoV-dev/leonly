import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APP_ROUTES } from "@/constants/routes";
import type { authClient } from "@/features/auth/api/auth-client";
import { serverApi } from "@/lib/axios/server-api";

type SessionResponse = {
  session: Pick<typeof authClient.$Infer.Session.session, "id">;
} | null;

async function hasBetterAuthSession(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get("cookie");

  try {
    const { data: session } = await serverApi.get<SessionResponse>("/auth/get-session", {
      headers: {
        ...(cookie ? { cookie } : {}),
      },
    });

    return Boolean(session?.session);
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
    return NextResponse.redirect(new URL(APP_ROUTES.HOME, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
