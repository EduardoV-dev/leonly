import { HttpException } from "@nestjs/common";
import { toNodeHandler } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

const { auth, nodeHandler } = vi.hoisted(() => ({
  auth: { handler: vi.fn() },
  nodeHandler: vi.fn(),
}));

vi.mock("better-auth/node", () => ({ toNodeHandler: vi.fn(() => nodeHandler) }));

describe("auth handler seam", () => {
  it("adapts the configured auth instance for Node HTTP", async () => {
    const { createAuthHandler } = await import("./handler");
    const authService = { auth };
    const logError = vi.fn();
    const enforce = vi.fn();
    const authHandler = createAuthHandler({
      authService,
      rateLimitGuard: { enforce },
      logger: { error: logError },
    });
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
    expect(logError).not.toHaveBeenCalled();
  });

  it("passes enforcement failures to the API exception pipeline without calling Better Auth", async () => {
    const { createAuthHandler } = await import("./handler");
    nodeHandler.mockClear();
    const error = new Error("Rate limited");
    const next = vi.fn();
    const logError = vi.fn();
    const handler = createAuthHandler({
      authService: { auth },
      rateLimitGuard: { enforce: vi.fn().mockRejectedValue(error) },
      logger: { error: logError },
    });
    await handler(
      { method: "GET", path: "/api/auth/get-session" } as Request,
      {} as Response,
      next as NextFunction,
    );
    expect(logError).toHaveBeenCalledWith({
      event: "auth_request_failed",
      method: "GET",
      path: "/api/auth/get-session",
      status: 500,
      err: error,
    });
    expect(next).toHaveBeenCalledWith(error);
    expect(nodeHandler).not.toHaveBeenCalled();
  });

  it("does not log expected client failures", async () => {
    const { createAuthHandler } = await import("./handler");
    const error = new HttpException("Too many requests", 429);
    const logError = vi.fn();
    const next = vi.fn();
    const handler = createAuthHandler({
      authService: { auth },
      rateLimitGuard: { enforce: vi.fn().mockRejectedValue(error) },
      logger: { error: logError },
    });

    await handler(
      { method: "GET", path: "/api/auth/get-session" } as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(logError).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});
