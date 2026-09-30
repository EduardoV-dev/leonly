import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios/api", () => ({ api: { request: requestMock } }));

import { POST } from "./route";

function createRequest(): Request {
  return new Request("http://localhost:3000/api/spaces", {
    method: "POST",
    headers: {
      origin: "http://untrusted.example",
      "sec-fetch-site": "cross-site",
      cookie: "better-auth.session_token=secret",
      "content-type": "application/json",
    },
    body: JSON.stringify({ space_name: "Forever Us" }),
  });
}

describe("POST /api/spaces proxy", () => {
  beforeEach(() => requestMock.mockReset());

  it("forwards browser security headers to Nest and preserves its response", async () => {
    const payload = { ok: true, data: { space_id: "space-id" }, error: [], message: "OK" };
    requestMock.mockResolvedValue({
      status: 200,
      statusText: "OK",
      data: Buffer.from(JSON.stringify(payload)),
      headers: { "content-type": "application/json" },
    });
    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/spaces",
        method: "POST",
        data: expect.any(ArrayBuffer),
        responseType: "arraybuffer",
        validateStatus: expect.any(Function),
        headers: {
          "content-type": "application/json",
          cookie: "better-auth.session_token=secret",
          origin: "http://untrusted.example",
          "sec-fetch-site": "cross-site",
        },
      }),
    );
  });

  it.each([400, 401, 409, 500, 502])("preserves a %i response", async (status) => {
    const payload = JSON.stringify({ message: "Nest response" });
    requestMock.mockResolvedValue({
      status,
      statusText: "Upstream status",
      data: Buffer.from(payload),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(status);
    expect(response.statusText).toBe("Upstream status");
    expect(await response.text()).toBe(payload);
  });

  it("preserves response headers and rethrows connection errors", async () => {
    requestMock.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: new ArrayBuffer(0),
      headers: {
        "content-type": "application/json",
        "set-cookie": ["session=one; HttpOnly", "csrf=two; SameSite=Lax"],
        "content-length": "0",
      },
    });

    const response = await POST(createRequest());

    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("set-cookie")).toContain("session=one");
    expect(response.headers.get("set-cookie")).toContain("csrf=two");
    expect(response.headers.has("content-length")).toBe(false);

    const error = new Error("Nest is unreachable");
    requestMock.mockRejectedValueOnce(error);
    await expect(POST(createRequest())).rejects.toBe(error);
  });
});
