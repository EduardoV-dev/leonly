import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  ENVIRONMENT_VARIABLES,
  getWebAppOrigin,
} from "../../common/config/environment-variables.config";
import type { PrismaService } from "../../common/prisma/prisma.service";

export function createAuth(prisma: PrismaService) {
  const baseURL = getWebAppOrigin();
  if (!baseURL) throw new Error("WEB_APP_ORIGIN is required.");

  const cookieDomain = ENVIRONMENT_VARIABLES.BETTER_AUTH_COOKIE_DOMAIN?.trim();
  const hostname = new URL(baseURL).hostname;
  const domain = cookieDomain?.replace(/^\./, "");
  const isCookieDomainValid =
    Boolean(domain) && (hostname === domain || hostname.endsWith(`.${domain}`));

  if (cookieDomain && !isCookieDomainValid) {
    throw new Error("BETTER_AUTH_COOKIE_DOMAIN must contain the canonical frontend hostname.");
  }

  return betterAuth({
    baseURL,
    secret: ENVIRONMENT_VARIABLES.BETTER_AUTH_SECRET,
    trustedOrigins: [baseURL],
    rateLimit: { enabled: false },
    advanced: {
      crossSubDomainCookies: {
        enabled: Boolean(cookieDomain),
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      },
    },
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
