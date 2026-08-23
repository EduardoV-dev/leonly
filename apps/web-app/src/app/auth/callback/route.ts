import { NextResponse } from "next/server";
import { APP_ROUTES } from "@/constants/routes";
import { createRequestLogger, logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestLogger = createRequestLogger(request);
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const defaultNext = APP_ROUTES.HOME;
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? defaultNext;
  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = defaultNext;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    logServerError(
      { event: "supabase_operation_failed", operation: "exchange_code_for_session" },
      error,
      requestLogger,
    );
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
