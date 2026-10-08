import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it, vi } from "vitest";
import type { ApiResponse } from "@/types/api-response";
import { api } from "./api";

vi.mock("@/constants/environment-variables", () => ({
  ENVIRONMENT_VARIABLES: { NEXT_PUBLIC_API_BASE_URL: "https://api.example.com/" },
}));

describe("api", () => {
  it("calls Nest directly with credentials, bounded requests, and JSON responses", () => {
    expect(api.getUri({ url: "/spaces" })).toBe("https://api.example.com/api/spaces");
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.timeout).toBe(5000);
    expect(api.defaults.responseType).toBe("json");
    expect(api.defaults.headers.Accept).toBe("application/json");
  });

  it("returns typed Axios responses with payloads and HTTP metadata", async () => {
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
        status: 200,
        statusText: "OK",
      }),
    );
    const response = await api.post<ApiResponse<null>>(
      "/spaces/invites/validations",
      { invite_code: "example" },
      { adapter },
    );
    expect(response.data).toEqual(payload);
    expect(response.status).toBe(200);
    expect(response.headers["retry-after"]).toBe("60");
    const config = adapter.mock.calls[0]?.[0];
    expect(config?.data).toBe(JSON.stringify({ invite_code: "example" }));
    expect(config?.timeout).toBe(5000);
    expect(config?.withCredentials).toBe(true);
    expect(config?.validateStatus?.(429)).toBe(false);
  });

  it("propagates non-success HTTP responses to catch handlers", async () => {
    const adapter = vi.fn(async (config) => {
      throw new AxiosError(
        "Request failed with status code 429",
        AxiosError.ERR_BAD_REQUEST,
        config,
        undefined,
        {
          config,
          data: { message: "Try again later." },
          headers: new AxiosHeaders({ "retry-after": "60" }),
          status: 429,
          statusText: "Too Many Requests",
        },
      );
    });

    await expect(api.get("/spaces", { adapter })).rejects.toMatchObject({
      response: { status: 429, headers: { "retry-after": "60" } },
    });
  });
});
