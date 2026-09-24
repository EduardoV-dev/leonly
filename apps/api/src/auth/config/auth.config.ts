import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ENVIRONMENT_VARIABLES } from "../../common/config/environment-variables.config";
import type { PrismaService } from "../../common/prisma/prisma.service";

export function createAuth(prisma: PrismaService) {
  return betterAuth({
    baseURL: ENVIRONMENT_VARIABLES.BETTER_AUTH_BASE_URL,
    secret: ENVIRONMENT_VARIABLES.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: ENVIRONMENT_VARIABLES.GOOGLE_CLIENT_ID,
        clientSecret: ENVIRONMENT_VARIABLES.GOOGLE_CLIENT_SECRET,
      },
    },
  });
}
