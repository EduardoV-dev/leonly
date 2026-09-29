import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios/api", () => ({ api: { request: requestMock } }));

import { GET } from "./route";

describe("GET /api/users/me/space proxy", () => {
  beforeEach(() => requestMock.mockReset());

  it("forwards the session cookie and preserves Nest's response", async () => {
    const payload = { ok: true, data: null, error: [], message: "OK" };
    requestMock.mockResolvedValue({
      status: 200,
      statusText: "OK",
      data: Buffer.from(JSON.stringify(payload)),
      headers: { "content-type": "application/json" },
    });

    const response = await GET(
      new Request("http://localhost:3000/api/users/me/space", {
        headers: { cookie: "better-auth.session_token=secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/users/me/space",
        method: "GET",
        data: undefined,
        headers: { cookie: "better-auth.session_token=secret" },
      }),
    );
  });
});
