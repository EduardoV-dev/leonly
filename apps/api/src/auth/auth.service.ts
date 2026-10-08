import { Injectable } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { PrismaService } from "../common/prisma/prisma.service";
import { createAuth } from "./config/auth.config";

export type SessionRequest = Request & {
  authUser?: { id: string; name?: string };
  authSessionResolved?: boolean;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
  private instance?: ReturnType<typeof createAuth>;

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
    if (!this.instance) this.instance = createAuth(this.prisma);
    return this.instance;
  }
}
