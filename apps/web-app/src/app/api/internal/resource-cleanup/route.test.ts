import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { cleanupResourcesMock, environmentVariables, logServerErrorMock, reaperMock } = vi.hoisted(
  () => ({
    cleanupResourcesMock: vi.fn(),
    environmentVariables: { CRON_SECRET: "cron-secret" },
    logServerErrorMock: vi.fn(),
    reaperMock: vi.fn(),
  }),
);

vi.mock("@/constants/environment-variables", () => ({
  ENVIRONMENT_VARIABLES: environmentVariables,
}));
vi.mock("@/features/memories/server/resource-cleanup", () => ({
  cleanupResources: cleanupResourcesMock,
  reapExpiredTemporaryMemoryObjects: reaperMock,
}));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => ({ child: vi.fn() })),
  logServerError: logServerErrorMock,
}));

import { GET } from "./route";

function request(authorization?: string): Request {
  return new Request("http://localhost/api/internal/resource-cleanup", {
    headers: authorization ? { authorization } : {},
  });
}

describe("GET /api/internal/resource-cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    environmentVariables.CRON_SECRET = "cron-secret";
    reaperMock.mockResolvedValue(undefined);
    cleanupResourcesMock.mockResolvedValue(undefined);
  });

  it("rejects missing or invalid authorization without running cleanup", async () => {
    for (const cleanupRequest of [request(), request("Bearer invalid")]) {
      const response = await GET(cleanupRequest);

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    }

    expect(reaperMock).not.toHaveBeenCalled();
    expect(cleanupResourcesMock).not.toHaveBeenCalled();
  });

  it("fails closed when the cron secret is missing", async () => {
    environmentVariables.CRON_SECRET = "";

    const response = await GET(request("Bearer cron-secret"));

    expect(response.status).toBe(401);
    expect(reaperMock).not.toHaveBeenCalled();
    expect(cleanupResourcesMock).not.toHaveBeenCalled();
  });

  it("reaps expired temporary objects before cleaning queued resources", async () => {
    const response = await GET(request("Bearer cron-secret"));

    expect(response.status).toBe(204);
    expect(reaperMock).toHaveBeenCalledOnce();
    expect(cleanupResourcesMock).toHaveBeenCalledOnce();
    expect(reaperMock.mock.invocationCallOrder[0]).toBeLessThan(
      cleanupResourcesMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("returns a safe error when scheduled cleanup fails", async () => {
    reaperMock.mockRejectedValue(new Error("storage credentials"));

    const response = await GET(request("Bearer cron-secret"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Cleanup failed." });
    expect(cleanupResourcesMock).not.toHaveBeenCalled();
    expect(logServerErrorMock).toHaveBeenCalledWith(
      { event: "resource_cleanup_failed", operation: "scheduled_resource_cleanup" },
      expect.objectContaining({ message: "storage credentials" }),
      expect.anything(),
    );
  });
});
