import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/constants/environment-variables", () => ({
  ENVIRONMENT_VARIABLES: {
    NEXT_PUBLIC_API_BASE_URL: "http://nest-api.test/",
  },
}));

import { serverApi } from "./server-api";

describe("server API client", () => {
  it("uses the configured Nest API base URL and api defaults", () => {
    expect(serverApi.getUri({ url: "/spaces" })).toBe("http://nest-api.test/api/spaces");
    expect(serverApi.defaults.withCredentials).toBe(true);
    expect(serverApi.defaults.timeout).toBe(5000);
    expect(serverApi.defaults.responseType).toBe("json");
    expect(serverApi.defaults.headers.Accept).toBe("application/json");
    expect(serverApi.defaults.validateStatus?.(429)).toBe(false);
  });
});
