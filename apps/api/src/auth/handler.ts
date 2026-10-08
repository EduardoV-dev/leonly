import { toNodeHandler } from "better-auth/node";
import type { RequestHandler } from "express";
import type { RateLimitOptions } from "../common/rate-limit/rate-limit.decorator";
import type { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";
import type { AuthService } from "./auth.service";

const SIGN_IN_RATE_LIMIT = {
  limit: 5,
  window: "1 m",
  strategy: "sliding-window",
  scope: "ip",
  key: "auth-sign-in",
} satisfies RateLimitOptions;

export function createAuthHandler(
  authService: AuthService,
  rateLimitGuard: RateLimitGuard,
): RequestHandler {
  const handler = toNodeHandler(authService.auth);
  return async (request, response, next) => {
    try {
      const isSignIn =
        request.method === "POST" &&
        /^\/api\/auth\/sign-in\/[^/]+$/i.test(request.path.replace(/\/+$/, ""));

      await rateLimitGuard.enforce({
        request,
        response,
        endpoint: "auth-sign-in",
        policy: isSignIn ? SIGN_IN_RATE_LIMIT : undefined,
      });
      await handler(request, response);
    } catch (error) {
      next(error);
    }
  };
}
