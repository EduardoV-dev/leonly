import { toNodeHandler } from "better-auth/node";
import type { RequestHandler } from "express";
import type { RateLimitGuard } from "../../common/rate-limit/guards/rate-limit.guard";
import type { RateLimitOptions } from "../../common/rate-limit/types/rate-limit.types";
import type { AuthService } from "../auth.service";

const SIGN_IN_RATE_LIMIT = {
  limit: 5,
  window: "1 m",
  strategy: "sliding-window",
  scope: "ip",
  key: "auth-sign-in",
} satisfies RateLimitOptions;

type CreateAuthHandlerParams = {
  authService: { readonly auth: Pick<AuthService["auth"], "handler"> };
  rateLimitGuard: Pick<RateLimitGuard, "enforce">;
};

export function createAuthHandler({
  authService,
  rateLimitGuard,
}: CreateAuthHandlerParams): RequestHandler {
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
