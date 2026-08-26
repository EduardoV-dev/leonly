import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getCoverPreviewUrl } from "./get-cover-preview-url";

const getAvailableMemoryMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("./get-available-memory", () => ({ getAvailableMemory: getAvailableMemoryMock }));

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const coverPhotoId = "22a6c4ed-10c7-42a9-a7a8-b31d210ea2bf";

function createSupabaseClient({
  coverObjectPath = "space-id/photo-id-cover.webp",
  objectPath = "space-id/photo-id.jpg",
  signingError = null,
}: {
  coverObjectPath?: string | null;
  objectPath?: string;
  signingError?: Error | null;
} = {}) {
  const photoQuery = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { cover_object_path: coverObjectPath, object_path: objectPath },
      error: null,
    }),
  };
  photoQuery.eq.mockReturnValue(photoQuery);
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: signingError ? null : { signedUrl: "https://storage.example/signed-cover" },
    error: signingError,
  });

  return {
    client: {
      from: vi.fn(() => ({ select: vi.fn(() => photoQuery) })),
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    },
    createSignedUrl,
    photoQuery,
  };
}

describe("getCoverPreviewUrl", () => {
  beforeEach(() => vi.clearAllMocks());

  it("signs only the persisted cover path after available-memory authorization", async () => {
    const { client, createSignedUrl, photoQuery } = createSupabaseClient();
    const calls: string[] = [];
    getAvailableMemoryMock.mockImplementation(async () => {
      calls.push("authorization");
      return { coverPhotoId, id: memoryId };
    });
    createSignedUrl.mockImplementation(async () => {
      calls.push("signing");
      return { data: { signedUrl: "https://storage.example/signed-cover" }, error: null };
    });
    createClientMock.mockResolvedValue(client);

    await expect(getCoverPreviewUrl(memoryId)).resolves.toBe(
      "https://storage.example/signed-cover",
    );
    expect(photoQuery.eq).toHaveBeenCalledWith("id", coverPhotoId);
    expect(photoQuery.eq).toHaveBeenCalledWith("memory_id", memoryId);
    expect(createSignedUrl).toHaveBeenCalledWith("space-id/photo-id-cover.webp", 300);
    expect(calls).toEqual(["authorization", "signing"]);
  });

  it.each(["missing", "deleted", "other-space", "unauthorized"])(
    "returns no URL for a %s memory",
    async () => {
      getAvailableMemoryMock.mockResolvedValue(null);

      await expect(getCoverPreviewUrl(memoryId)).resolves.toBeNull();
      expect(createClientMock).not.toHaveBeenCalled();
    },
  );

  it("returns no URL without calling Supabase for malformed identifiers", async () => {
    await expect(getCoverPreviewUrl("not-a-uuid")).resolves.toBeNull();
    expect(getAvailableMemoryMock).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns no URL when signing fails without exposing the persisted path", async () => {
    const { client, createSignedUrl } = createSupabaseClient({
      coverObjectPath: "private-space/cover.webp",
      objectPath: "private-space/cover.jpg",
      signingError: new Error("storage unavailable"),
    });
    getAvailableMemoryMock.mockResolvedValue({ coverPhotoId, id: memoryId });
    createClientMock.mockResolvedValue(client);

    await expect(getCoverPreviewUrl(memoryId)).resolves.toBeNull();
    expect(createSignedUrl).toHaveBeenCalledWith("private-space/cover.webp", 300);
  });

  it("falls back to the original path for photos created before variants", async () => {
    const { client, createSignedUrl } = createSupabaseClient({ coverObjectPath: null });
    getAvailableMemoryMock.mockResolvedValue({ coverPhotoId, id: memoryId });
    createClientMock.mockResolvedValue(client);

    await expect(getCoverPreviewUrl(memoryId)).resolves.toBe(
      "https://storage.example/signed-cover",
    );
    expect(createSignedUrl).toHaveBeenCalledWith("space-id/photo-id.jpg", 300);
  });
});
