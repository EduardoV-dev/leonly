import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("@/lib/axios/api", () => ({
  api: { request: apiRequestMock },
}));

import { GET } from "./route";

const context = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe("Better Auth API proxy", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("forwards the request to the Nest API and preserves auth cookies", async () => {
    apiRequestMock.mockResolvedValue({
      data: new TextEncoder().encode(JSON.stringify({ session: null })).buffer,
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "application/json",
        "set-cookie": ["better-auth.session_token=value; Path=/; HttpOnly"],
      },
    });

    const response = await GET(
      new Request("http://localhost:3000/api/auth/get-session?source=web"),
      context(["get-session"]),
    );

    expect(apiRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        responseType: "arraybuffer",
        url: "/api/auth/get-session?source=web",
        maxRedirects: 0,
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=value");
  });

  it("preserves OAuth redirects without following them", async () => {
    apiRequestMock.mockResolvedValue({
      data: new ArrayBuffer(0),
      status: 302,
      statusText: "Found",
      headers: { location: "https://accounts.google.com/o/oauth2/auth" },
    });

    const response = await GET(
      new Request("http://localhost:3000/api/auth/callback/google"),
      context(["callback", "google"]),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://accounts.google.com/o/oauth2/auth");
    expect(apiRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        maxRedirects: 0,
        url: "/api/auth/callback/google",
      }),
    );
  });
});
