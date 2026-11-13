import { Injectable, Logger } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { PrismaService } from "../common/prisma/prisma.service";
import { createAuth } from "./configs/auth.config";

export type SessionRequest = Request & {
  authUser?: { id: string; name?: string };
  authSessionResolved?: boolean;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private instance?: ReturnType<typeof createAuth>;

  constructor(private readonly prismaService: PrismaService) {}

  async getRequestUser(request: SessionRequest): Promise<SessionRequest["authUser"]> {
    if (request.authSessionResolved) return request.authUser;

    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    request.authUser = session?.user?.id
      ? { id: session.user.id, name: session.user.name }
      : undefined;

    request.authSessionResolved = true;
    return request.authUser;
  }

  get auth(): ReturnType<typeof createAuth> {
    if (!this.instance) this.instance = createAuth(this.prismaService, this.logger);
    return this.instance;
  }
}
