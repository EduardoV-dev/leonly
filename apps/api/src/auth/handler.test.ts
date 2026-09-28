import { toNodeHandler } from "better-auth/node";
import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "./auth.service";

const { auth, nodeHandler } = vi.hoisted(() => ({
  auth: { handler: vi.fn() },
  nodeHandler: vi.fn(),
}));

vi.mock("better-auth/node", () => ({ toNodeHandler: vi.fn(() => nodeHandler) }));

describe("auth handler seam", () => {
  it("adapts the configured auth instance for Node HTTP", async () => {
    const { createAuthHandler } = await import("./handler");
    const authService = { auth } as unknown as AuthService;

    const authHandler = createAuthHandler(authService);
    expect(toNodeHandler).toHaveBeenCalledWith(auth);
    expect(authHandler).toBe(nodeHandler);
  });
});
