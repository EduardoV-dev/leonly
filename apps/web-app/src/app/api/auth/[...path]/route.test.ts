import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock, logServerErrorMock, requestLoggerMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  logServerErrorMock: vi.fn(),
  requestLoggerMock: {},
}));

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({ request: apiRequestMock })),
    },
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: () => requestLoggerMock,
  logServerError: logServerErrorMock,
}));
vi.mock("@/constants/environment-variables", () => ({
  ENVIRONMENT_VARIABLES: { NEXT_PUBLIC_API_BASE_URL: "http://nest-api.test" },
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
        "set-cookie": [
          "better-auth.session_token=value; Domain=example.com; Path=/; HttpOnly; Secure; SameSite=Lax",
        ],
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
        url: "/auth/get-session?source=web",
        maxRedirects: 0,
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=value");
    expect(response.headers.get("set-cookie")).toContain("Domain=example.com");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly; Secure; SameSite=Lax");
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
        url: "/auth/callback/google",
      }),
    );
  });

  it("returns a gateway error when the authentication service cannot be reached", async () => {
    const connectionError = new Error("Connection refused");
    apiRequestMock.mockRejectedValue(connectionError);

    const response = await GET(
      new Request("http://localhost:3000/api/auth/get-session"),
      context(["get-session"]),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      message: "Authentication service is unavailable.",
    });
    expect(logServerErrorMock).toHaveBeenCalledWith(
      { event: "auth_proxy_failed", operation: "proxy_auth_request" },
      connectionError,
      requestLoggerMock,
    );
  });
});
