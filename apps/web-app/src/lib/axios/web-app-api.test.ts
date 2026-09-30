import { AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it, vi } from "vitest";
import type { ApiResponse } from "@/types/api-response";
import { webAppApi } from "./web-app-api";

describe("webAppApi", () => {
  it("uses same-origin API routes with bounded requests and JSON response preference", () => {
    expect(webAppApi.getUri({ url: "/spaces" })).toBe("/api/spaces");
    expect(webAppApi.defaults.timeout).toBe(5000);
    expect(webAppApi.defaults.responseType).toBe("json");
    expect(webAppApi.defaults.headers.Accept).toBe("application/json");
  });

  it("preserves typed payloads, HTTP statuses, and retry headers for feature error handling", async () => {
    const payload: ApiResponse<null> = {
      ok: false,
      data: null,
      error: [{ code: "HTTP_429", message: "Try again later." }],
      message: "Try again later.",
    };
    const adapter = vi.fn(
      async (config): Promise<AxiosResponse<ApiResponse<null>>> => ({
        config,
        data: payload,
        headers: new AxiosHeaders({ "retry-after": "60" }),
        status: 429,
        statusText: "Too Many Requests",
      }),
    );
    const response = await webAppApi.post<ApiResponse<null>>(
      "/spaces/invite-validations",
      { invite_code: "example" },
      { adapter },
    );
    expect(response.data).toEqual(payload);
    expect(response.status).toBe(429);
    expect(response.headers["retry-after"]).toBe("60");
    const config = adapter.mock.calls[0]?.[0];
    expect(config?.data).toBe(JSON.stringify({ invite_code: "example" }));
    expect(config?.timeout).toBe(5000);
    expect(config?.validateStatus?.(429)).toBe(true);
  });
});
