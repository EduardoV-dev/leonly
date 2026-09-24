import { toNodeHandler } from "better-auth/node";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../common/prisma/prisma.service";
import { createAuth } from "./config/auth.config";

const { auth, nodeHandler } = vi.hoisted(() => ({
  auth: { handler: vi.fn() },
  nodeHandler: vi.fn(),
}));

vi.mock("./config/auth.config", () => ({ createAuth: vi.fn(() => auth) }));
vi.mock("better-auth/node", () => ({ toNodeHandler: vi.fn(() => nodeHandler) }));

describe("auth handler seam", () => {
  it("adapts the configured auth instance for Node HTTP", async () => {
    const { createAuthHandler } = await import("./handler");
    const prisma = {} as PrismaService;

    const authHandler = createAuthHandler(prisma);
    expect(createAuth).toHaveBeenCalledWith(prisma);
    expect(toNodeHandler).toHaveBeenCalledWith(auth);
    expect(authHandler).toBe(nodeHandler);
  });
});
