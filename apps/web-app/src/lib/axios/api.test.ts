import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/constants/environment-variables", () => ({
  ENVIRONMENT_VARIABLES: {
    API_BASE_URL: "http://nest-api.test",
  },
}));

import { api } from "./api";

describe("Nest API client", () => {
  it("uses the configured Nest API base URL", () => {
    expect(api.defaults.baseURL).toBe("http://nest-api.test");
  });
});
