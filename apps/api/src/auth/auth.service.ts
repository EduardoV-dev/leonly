import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { createAuth } from "./config/auth.config";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
  private instance?: ReturnType<typeof createAuth>;

  get auth(): ReturnType<typeof createAuth> {
    if (!this.instance) this.instance = createAuth(this.prisma);
    return this.instance;
  }
}
