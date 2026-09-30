import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWebAppOrigins } from "../../common/config/environment-variables.config";
import type { PrismaService } from "../../common/prisma/prisma.service";
import { createAuth } from "./auth.config";

vi.mock("better-auth", () => ({ betterAuth: vi.fn(() => ({ handler: "unmounted" })) }));
vi.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: vi.fn(() => "database") }));
vi.mock("../../common/config/environment-variables.config", () => ({
  ENVIRONMENT_VARIABLES: {
    BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    WEB_APP_ORIGINS: "http://localhost:3000",
  },
  getWebAppOrigins: vi.fn(() => ["http://localhost:3000"]),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getWebAppOrigins).mockReturnValue(["http://localhost:3000"]);
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
    expect(Object.keys(options?.socialProviders ?? {})).toEqual(["google"]);
  });

  it("uses the first origin for callbacks and trusts all configured origins", () => {
    const origins = ["https://app.example.com", "https://preview.example.com"];
    vi.mocked(getWebAppOrigins).mockReturnValue(origins);
    createAuth({} as PrismaService);
    const options = vi.mocked(betterAuth).mock.calls[0]?.[0];
    expect(options?.baseURL).toBe(origins[0]);
    expect(options?.trustedOrigins).toEqual(origins);
  });

  it("rejects missing canonical origins", () => {
    vi.mocked(getWebAppOrigins).mockReturnValue([]);
    expect(() => createAuth({} as PrismaService)).toThrow("WEB_APP_ORIGINS");
  });
});
