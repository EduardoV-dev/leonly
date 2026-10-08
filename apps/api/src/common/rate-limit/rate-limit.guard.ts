import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import { AuthService, type SessionRequest } from "../../auth/auth.service";
import { GLOBAL_RATE_LIMIT } from "./rate-limit.constants";
import { RATE_LIMIT_KEY, type RateLimitOptions } from "./rate-limit.decorator";
import { RateLimitService } from "./rate-limit.service";

type EnforceParams = Readonly<{
  request: SessionRequest;
  response: Response;
  endpoint: string;
  policy?: RateLimitOptions;
}>;

type AssertAllowedParams = Readonly<{
  result: { success: boolean; reset: number };
  response: Response;
  message?: string;
}>;

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: RateLimitService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const policy = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    await this.enforce({
      request: http.getRequest<SessionRequest>(),
      response: http.getResponse<Response>(),
      endpoint: `${context.getClass().name}:${context.getHandler().name}`,
      policy,
    });

    return true;
  }

  async enforce({ request, response, endpoint, policy }: EnforceParams): Promise<void> {
    const user = await this.auth.getRequestUser(request);
    const ip = request.socket.remoteAddress;

    if (!ip) throw new Error("Request client address is unavailable.");

    const ipIdentifier = `ip:${ip}`;
    const userIdentifier = user ? `user:${user.id}` : ipIdentifier;

    const globalResult = await this.rateLimit.check({
      identifier: GLOBAL_RATE_LIMIT.scope === "user" ? userIdentifier : ipIdentifier,
    });
    this.assertAllowed({ result: globalResult, response });

    if (!policy) return;

    const result = await this.rateLimit.check({
      identifier: policy.scope === "ip" ? ipIdentifier : userIdentifier,
      endpoint,
      policy,
    });
    this.assertAllowed({ result, response, message: policy.message });
  }

  private assertAllowed({
    result,
    response,
    message = "Too many requests. Try again later.",
  }: AssertAllowedParams): void {
    if (result.success) return;

    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    response.setHeader("Retry-After", String(retryAfter));

    throw new HttpException({ error: message }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
