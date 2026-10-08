import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ENVIRONMENT_VARIABLES,
  getWebAppOrigin,
} from "../../common/config/environment-variables.config";
import type { PrismaService } from "../../common/prisma/prisma.service";
import { createAuth } from "./auth.config";

vi.mock("better-auth", () => ({ betterAuth: vi.fn(() => ({ handler: "unmounted" })) }));
vi.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: vi.fn(() => "database") }));
vi.mock("../../common/config/environment-variables.config", () => ({
  ENVIRONMENT_VARIABLES: {
    BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
    BETTER_AUTH_COOKIE_DOMAIN: "",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    WEB_APP_ORIGIN: "http://localhost:3000",
  },
  getWebAppOrigin: vi.fn(() => "http://localhost:3000"),
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(ENVIRONMENT_VARIABLES, { BETTER_AUTH_COOKIE_DOMAIN: "" });
  vi.mocked(getWebAppOrigin).mockReturnValue("http://localhost:3000");
});

describe("createAuth", () => {
  it("uses the Nest-owned Prisma client for persistent authentication", () => {
    const prisma = {} as PrismaService;
    const auth = createAuth(prisma);
    expect(auth).toEqual({ handler: "unmounted" });
    expect(prismaAdapter).toHaveBeenCalledWith(prisma, { provider: "postgresql" });
    expect(betterAuth).toHaveBeenCalledTimes(1);
  });

  it("configures only Google sign-in without password authentication", () => {
    createAuth({} as PrismaService);
    const options = vi.mocked(betterAuth).mock.calls[0]?.[0];
    expect(options?.database).toBe("database");
    expect(options?.baseURL).toBe("http://localhost:3000");
    expect(options?.trustedOrigins).toEqual(["http://localhost:3000"]);
    expect(options?.emailAndPassword).toEqual({ enabled: false });
    expect(options?.rateLimit?.enabled).toBe(false);
    expect(options?.advanced?.crossSubDomainCookies?.enabled).toBe(false);
    expect(Object.keys(options?.socialProviders ?? {})).toEqual(["google"]);
  });

  it("uses the configured origin for callbacks and origin checks", () => {
    const origin = "https://app.example.com";
    vi.mocked(getWebAppOrigin).mockReturnValue(origin);
    createAuth({} as PrismaService);
    const options = vi.mocked(betterAuth).mock.calls[0]?.[0];
    expect(options?.baseURL).toBe(origin);
    expect(options?.trustedOrigins).toEqual([origin]);
  });

  it("rejects a missing web app origin", () => {
    vi.mocked(getWebAppOrigin).mockReturnValue("");
    expect(() => createAuth({} as PrismaService)).toThrow("WEB_APP_ORIGIN");
  });

  it("shares auth cookies across configured frontend and API subdomains", () => {
    vi.mocked(getWebAppOrigin).mockReturnValue("https://app.example.com");
    Object.assign(ENVIRONMENT_VARIABLES, { BETTER_AUTH_COOKIE_DOMAIN: ".example.com" });
    createAuth({} as PrismaService);
    const options = vi.mocked(betterAuth).mock.calls[0]?.[0];
    expect(options?.baseURL).toBe("https://app.example.com");
    expect(options?.advanced?.crossSubDomainCookies).toEqual({
      enabled: true,
      domain: ".example.com",
    });
  });

  it("rejects a cookie domain that cannot be set by the auth proxy", () => {
    vi.mocked(getWebAppOrigin).mockReturnValue("https://app.example.com");
    Object.assign(ENVIRONMENT_VARIABLES, { BETTER_AUTH_COOKIE_DOMAIN: "api.example.com" });
    expect(() => createAuth({} as PrismaService)).toThrow("BETTER_AUTH_COOKIE_DOMAIN");
  });
});
