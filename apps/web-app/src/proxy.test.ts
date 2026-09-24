import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock("@/lib/axios/api", () => ({
  api: { get: apiGetMock },
}));

import { proxy } from "./proxy";

describe("auth proxy", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiGetMock.mockResolvedValue({ data: { session: null }, status: 200 });
  });

  it("does not intercept the Better Auth BFF", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/api/auth/get-session"));

    expect(response.status).toBe(200);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it("leaves application API routes to their handlers", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/api/spaces/create"));

    expect(response.status).toBe(200);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it("allows unauthenticated users to view the auth page", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/auth"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects authenticated users away from the auth page", async () => {
    apiGetMock.mockResolvedValue({ data: { session: { id: "session-id" } }, status: 200 });

    const response = await proxy(new NextRequest("http://localhost:3000/auth"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/welcome/create/start");
  });

  it("redirects unauthenticated application requests to the auth page", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/timeline"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/auth");
  });

  it("allows authenticated application requests and forwards the session cookie", async () => {
    apiGetMock.mockResolvedValue({ data: { session: { id: "session-id" } }, status: 200 });

    const response = await proxy(
      new NextRequest("http://localhost:3000/timeline", {
        headers: { cookie: "better-auth.session_token=session-token" },
      }),
    );

    expect(response.status).toBe(200);
    expect(apiGetMock).toHaveBeenCalledWith(
      "/api/auth/get-session",
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: "better-auth.session_token=session-token",
        }),
      }),
    );
  });
});
