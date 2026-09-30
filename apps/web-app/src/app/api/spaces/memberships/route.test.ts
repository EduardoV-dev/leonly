import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const proxyRequestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios/proxy-request", () => ({ proxyRequest: proxyRequestMock }));

describe("POST /api/spaces/memberships", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards the original request to the authenticated Nest endpoint", async () => {
    const request = new Request("http://localhost/api/spaces/memberships", {
      body: JSON.stringify({ display_name: "Leo", invite_code: "LNY-7KMP2" }),
      headers: { "Content-Type": "application/json", Cookie: "better-auth.session_token=secret" },
      method: "POST",
    });
    const nestResponse = new Response("joined", {
      headers: { "Retry-After": "23" },
      status: 429,
    });
    proxyRequestMock.mockResolvedValue(nestResponse);

    const response = await POST(request);

    expect(proxyRequestMock).toHaveBeenCalledWith(request, "/api/spaces/memberships");
    expect(response).toBe(nestResponse);
    expect(response.headers.get("Retry-After")).toBe("23");
  });
});
