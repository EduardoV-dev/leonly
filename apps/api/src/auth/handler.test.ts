import { toNodeHandler } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";
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

    const enforce = vi.fn();
    const authHandler = createAuthHandler(authService, { enforce } as unknown as RateLimitGuard);
    const request = { method: "POST", path: "/api/auth/sign-in/social" } as Request;
    const response = {} as Response;
    await authHandler(request, response, vi.fn());
    expect(toNodeHandler).toHaveBeenCalledWith(auth);
    expect(enforce).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        response,
        policy: expect.objectContaining({ limit: 5, scope: "ip" }),
      }),
    );
    expect(nodeHandler).toHaveBeenCalledWith(request, response);
  });

  it("passes enforcement failures to the API exception pipeline without calling Better Auth", async () => {
    const { createAuthHandler } = await import("./handler");
    nodeHandler.mockClear();
    const error = new Error("Rate limited");
    const next = vi.fn();
    const handler = createAuthHandler(
      { auth } as unknown as AuthService,
      { enforce: vi.fn().mockRejectedValue(error) } as unknown as RateLimitGuard,
    );
    await handler(
      { method: "GET", path: "/api/auth/get-session" } as Request,
      {} as Response,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith(error);
    expect(nodeHandler).not.toHaveBeenCalled();
  });
});
