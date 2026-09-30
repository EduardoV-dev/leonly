import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const proxyRequestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios/proxy-request", () => ({ proxyRequest: proxyRequestMock }));

describe("POST /api/spaces/invite-validations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards the original request to the authenticated Nest endpoint", async () => {
    const request = new Request("http://localhost/api/spaces/invite-validations", {
      body: JSON.stringify({ invite_code: "LNY-7KMP2" }),
      headers: { "Content-Type": "application/json", Cookie: "better-auth.session_token=secret" },
      method: "POST",
    });
    const nestResponse = Response.json({
      ok: true,
      data: { valid: true },
      error: [],
      message: "ok",
    });
    proxyRequestMock.mockResolvedValue(nestResponse);

    const response = await POST(request);

    expect(proxyRequestMock).toHaveBeenCalledWith(request, "/api/spaces/invite-validations");
    expect(response).toBe(nestResponse);
    expect(await response.json()).toMatchObject({ data: { valid: true } });
  });
});
