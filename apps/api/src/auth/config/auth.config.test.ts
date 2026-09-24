import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../common/prisma/prisma.service";
import { createAuth } from "./auth.config";

vi.mock("better-auth", () => ({ betterAuth: vi.fn(() => ({ handler: "unmounted" })) }));
vi.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: vi.fn(() => "database") }));
vi.mock("../../common/config/environment-variables.config", () => ({
  ENVIRONMENT_VARIABLES: {
    APP_BASE_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    WEB_APP_ORIGINS: "http://localhost:3000",
  },
  getWebAppOrigins: () => ["http://localhost:3000"],
}));

beforeEach(() => vi.clearAllMocks());

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
    expect(options?.trustedOrigins).toEqual(["http://localhost:3000"]);
    expect(options?.emailAndPassword).toEqual({ enabled: false });
    expect(Object.keys(options?.socialProviders ?? {})).toEqual(["google"]);
  });
});
