import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { IS_PUBLIC_KEY } from "./decorators/public";

export type AuthenticatedRequest = Request & {
  authUser: { id: string; name?: string };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.authService.getRequestUser(request);
    if (!user) {
      throw new UnauthorizedException({ error: "Authentication is required." });
    }

    request.authUser = user;
    return true;
  }
}
