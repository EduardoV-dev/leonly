import { toNodeHandler } from "better-auth/node";
import type { PrismaService } from "../common/prisma/prisma.service";
import { createAuth } from "./config/auth.config";

export function createAuthHandler(prisma: PrismaService) {
  return toNodeHandler(createAuth(prisma));
}
