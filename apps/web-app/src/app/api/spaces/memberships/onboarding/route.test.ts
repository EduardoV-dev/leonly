import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const proxyRequestMock = vi.hoisted(() => vi.fn());
const request = new Request("http://localhost/api/spaces/memberships/onboarding", {
  method: "POST",
});

vi.mock("@/lib/axios/proxy-request", () => ({ proxyRequest: proxyRequestMock }));

describe("POST /api/spaces/memberships/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proxyRequestMock.mockResolvedValue(new Response(null, { status: 200 }));
  });

  it("proxies setup completion to the Better Auth API", async () => {
    await POST(request);

    expect(proxyRequestMock).toHaveBeenCalledWith(request, "/api/spaces/memberships/onboarding");
  });
});
