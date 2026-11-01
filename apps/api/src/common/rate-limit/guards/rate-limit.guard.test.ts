import { HttpException, Module } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import type { Response } from "express";
import { describe, expect, it, type Mock, vi } from "vitest";
import { AuthService, type SessionRequest } from "../../../auth/auth.service";
import { RateLimit } from "../decorators/rate-limit.decorator";
import { RateLimitService } from "../rate-limit.service";
import type { RateLimitOptions } from "../types/rate-limit.types";
import { RateLimitGuard } from "./rate-limit.guard";

const POLICY = {
  limit: 5,
  window: "10 m",
  strategy: "fixed-window",
  scope: "user",
} satisfies RateLimitOptions;

@Module({})
class RateLimitFixtureModule {}

type CreateGuardFixtureReturn = {
  guard: RateLimitGuard;
  check: Mock<RateLimitService["check"]>;
  getRequestUser: Mock<AuthService["getRequestUser"]>;
  request: SessionRequest;
  response: Pick<Response, "setHeader">;
  setHeader: Mock<Response["setHeader"]>;
};

async function createGuardFixture(): Promise<CreateGuardFixtureReturn> {
  const check = vi.fn<RateLimitService["check"]>().mockResolvedValue({ success: true, reset: 0 });
  const getRequestUser = vi.fn<AuthService["getRequestUser"]>().mockResolvedValue({ id: "one" });
  const app = await NestFactory.createApplicationContext(
    {
      module: RateLimitFixtureModule,
      providers: [
        Reflector,
        {
          provide: RateLimitService,
          useValue: { check } satisfies Pick<RateLimitService, "check">,
        },
        {
          provide: AuthService,
          useValue: { getRequestUser } satisfies Pick<AuthService, "getRequestUser">,
        },
        RateLimitGuard,
      ],
    },
    { logger: false },
  );
  const guard = app.get(RateLimitGuard);
  await app.close();

  const request = { socket: { remoteAddress: "127.0.0.1" } } as SessionRequest;
  const setHeader = vi.fn<Response["setHeader"]>();
  const response = { setHeader };

  return { guard, check, getRequestUser, request, response, setHeader };
}

describe("RateLimitGuard", () => {
  it("uses verified user identity globally while enforcing an IP-scoped endpoint policy", async () => {
    const { guard, check, request, response } = await createGuardFixture();
    await guard.enforce({
      request,
      response,
      endpoint: "sign-in",
      policy: { ...POLICY, scope: "ip" },
    });
    expect(check.mock.calls).toEqual([
      [{ identifier: "user:one" }],
      [{ identifier: "ip:127.0.0.1", endpoint: "sign-in", policy: { ...POLICY, scope: "ip" } }],
    ]);
  });

  it("isolates verified users and falls back to IP for anonymous requests", async () => {
    const { guard, check, getRequestUser, request, response } = await createGuardFixture();
    getRequestUser
      .mockResolvedValueOnce({ id: "one" })
      .mockResolvedValueOnce({ id: "two" })
      .mockResolvedValueOnce(undefined);
    for (let index = 0; index < 3; index += 1)
      await guard.enforce({ request, response, endpoint: "read" });
    expect(check.mock.calls.map(([options]) => options.identifier)).toEqual([
      "user:one",
      "user:two",
      "ip:127.0.0.1",
    ]);
  });

  it("short-circuits endpoint checks when the global quota is exhausted", async () => {
    const { guard, check, request, response, setHeader } = await createGuardFixture();
    check.mockResolvedValue({ success: false, reset: Date.now() - 1 });
    await expect(
      guard.enforce({ request, response, endpoint: "join", policy: POLICY }),
    ).rejects.toThrow(HttpException);
    expect(check).toHaveBeenCalledOnce();
    expect(setHeader).toHaveBeenCalledWith("Retry-After", "1");
  });

  it("lets handler policy override controller policy", async () => {
    @RateLimit(POLICY)
    class Controller {
      @RateLimit({ ...POLICY, limit: 2 })
      write() {}
      read() {}
    }
    const { guard, check, request, response } = await createGuardFixture();
    const context = (handler: () => void) => ({
      getClass: () => Controller,
      getHandler: () => handler,
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    });
    await guard.canActivate(context(Controller.prototype.write) as never);
    expect(check).toHaveBeenLastCalledWith(
      expect.objectContaining({ policy: { ...POLICY, limit: 2 } }),
    );
    await guard.canActivate(context(Controller.prototype.read) as never);
    expect(check).toHaveBeenLastCalledWith(expect.objectContaining({ policy: POLICY }));
  });
});
