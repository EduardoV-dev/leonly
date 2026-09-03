import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createClientMock, getMemoryPhotoMock, logServerErrorMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getMemoryPhotoMock: vi.fn(),
  logServerErrorMock: vi.fn(),
}));

vi.mock("@/features/memories/server/get-memory-photo", () => ({
  getMemoryPhoto: getMemoryPhotoMock,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => ({ child: vi.fn() })),
  logServerError: logServerErrorMock,
}));

import { GET } from "./route";

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const photoId = "22a6c4ed-10c7-42a9-a7a8-b31d210ea2bf";

function context(variant = "cover", requestedMemoryId = memoryId, requestedPhotoId = photoId) {
  return {
    params: Promise.resolve({ memoryId: requestedMemoryId, photoId: requestedPhotoId, variant }),
  };
}

function request(variant = "cover"): Request {
  return new Request(`http://localhost/api/memories/${memoryId}/photos/${photoId}/${variant}`);
}

function expectPrivateMediaHeaders(response: Response): void {
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-type")).toBe("image/webp");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("location")).toBeNull();
}

describe("GET /api/memories/[memoryId]/photos/[photoId]/[variant]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "member-id" } } }) },
    });
    getMemoryPhotoMock.mockResolvedValue(new Uint8Array([82, 73, 70, 70]).buffer);
  });

  it.each(["cover", "detail"])(
    "returns direct %s bytes with private security headers",
    async (variant) => {
      const response = await GET(request(variant), context(variant));

      expect(response.status).toBe(200);
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(
        new Uint8Array([82, 73, 70, 70]),
      );
      expect(getMemoryPhotoMock).toHaveBeenCalledWith(memoryId, photoId, variant);
      expectPrivateMediaHeaders(response);
    },
  );

  it("returns the same empty unavailable response before resolving an unauthenticated target", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await GET(request(), context());

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(getMemoryPhotoMock).not.toHaveBeenCalled();
    expectPrivateMediaHeaders(response);
  });

  it.each([
    ["invalid-memory", photoId, "cover"],
    [memoryId, "invalid-photo", "cover"],
    [memoryId, photoId, "original"],
  ])(
    "returns generic unavailable for malformed, foreign, or denied media",
    async (memory, photo, variant) => {
      getMemoryPhotoMock.mockResolvedValue(null);

      const response = await GET(request(variant), context(variant, memory, photo));

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("");
      expectPrivateMediaHeaders(response);
    },
  );

  it("redacts metadata and object failures", async () => {
    getMemoryPhotoMock.mockRejectedValue(new Error("private/object/path.webp?token=secret"));

    const response = await GET(request(), context());

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(response.headers.get("location")).toBeNull();
    expect(logServerErrorMock).toHaveBeenCalledOnce();
  });
});
