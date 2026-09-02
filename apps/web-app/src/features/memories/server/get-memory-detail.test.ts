import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getMemoryDetail } from "./get-memory-detail";
import { getVaultMemoryDetail } from "./get-vault-memory-detail";

const { createClientMock, getAvailableMemoryMock, signedUrlMock, creatorResult, photosResult } =
  vi.hoisted(() => ({
    createClientMock: vi.fn(),
    getAvailableMemoryMock: vi.fn(),
    signedUrlMock: vi.fn(),
    creatorResult: { data: null as unknown, error: null as unknown },
    photosResult: { data: null as unknown, error: null as unknown },
  }));

vi.mock("./get-available-memory", () => ({ getAvailableMemory: getAvailableMemoryMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({ logServerError: vi.fn() }));

const memory = {
  coverPhotoId: "64d44f34-c5fe-482a-b65b-f91d0173b7fe",
  createdAt: "2026-08-23T10:00:00.000Z",
  creatorUserId: "e951cd4b-7567-4b1e-a5d3-18aa810cbd8e",
  description: "A quiet afternoon together.",
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  location: "The botanical gardens",
  memoryDate: "2026-08-20",
  spaceId: "561ecf16-cc9f-489c-ac1d-38fbfc35d97c",
  title: "Among the flowers",
  updatedAt: "2026-08-23T10:00:00.000Z",
  visibility: "timeline" as const,
};

function queryBuilder(result: typeof creatorResult | typeof photosResult) {
  const builder = {
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    order: vi.fn(async () => result),
    select: vi.fn(() => builder),
  };
  return builder;
}

describe("getMemoryDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    creatorResult.data = {
      display_name: "Sarah",
      users: { avatar_url: "https://avatars.example/sarah.jpg" },
    };
    creatorResult.error = null;
    photosResult.data = [];
    photosResult.error = null;
    getAvailableMemoryMock.mockResolvedValue(memory);
    signedUrlMock.mockImplementation(async (path: string) => ({
      data: { signedUrl: `https://storage.example/${path}` },
      error: null,
    }));
    createClientMock.mockResolvedValue({
      from: vi.fn((table: string) =>
        table === "space_members" ? queryBuilder(creatorResult) : queryBuilder(photosResult),
      ),
      storage: { from: vi.fn(() => ({ createSignedUrl: signedUrlMock })) },
    });
  });

  it("preserves the generic unavailable outcome without dependent reads", async () => {
    getAvailableMemoryMock.mockResolvedValue(null);

    await expect(getMemoryDetail("not-a-uuid")).resolves.toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns complete timeline and Vault detail through their visibility-specific resolvers", async () => {
    await expect(getMemoryDetail(memory.id)).resolves.toMatchObject({
      creatorAvatarUrl: "https://avatars.example/sarah.jpg",
      creatorDisplayName: "Sarah",
      description: "A quiet afternoon together.",
      location: "The botanical gardens",
      visibility: "timeline",
    });

    getAvailableMemoryMock.mockResolvedValue({ ...memory, visibility: "vault" });
    await expect(getVaultMemoryDetail(memory.id)).resolves.toMatchObject({ visibility: "vault" });
  });

  it("does not load dependent data when the memory belongs to another detail route", async () => {
    getAvailableMemoryMock.mockResolvedValue({ ...memory, visibility: "vault" });

    await expect(getMemoryDetail(memory.id)).resolves.toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("promotes the cover and keeps the remaining persisted order", async () => {
    photosResult.data = [
      {
        cover_object_path: "space/first-cover.webp",
        detail_object_path: "space/first-detail.webp",
        id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
        object_path: "space/first.webp",
        position: 0,
      },
      {
        cover_object_path: "space/second-cover.webp",
        detail_object_path: "space/second-detail.webp",
        id: "cc2df916-833a-4f1b-b744-b7b4c176ae93",
        object_path: "space/second.webp",
        position: 1,
      },
      {
        cover_object_path: "space/cover-card.webp",
        detail_object_path: "space/cover-detail.webp",
        id: memory.coverPhotoId,
        object_path: "space/cover.webp",
        position: 2,
      },
    ];

    const detail = await getMemoryDetail(memory.id);

    expect(detail?.photos.map((photo) => photo.id)).toEqual([
      memory.coverPhotoId,
      "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
      "cc2df916-833a-4f1b-b744-b7b4c176ae93",
    ]);
  });

  it("keeps other photos available when one signing request fails", async () => {
    photosResult.data = [
      {
        cover_object_path: "space/cover-card.webp",
        detail_object_path: "space/cover-detail.webp",
        id: memory.coverPhotoId,
        object_path: "space/cover.webp",
        position: 0,
      },
      {
        cover_object_path: "space/failed-cover.webp",
        detail_object_path: "space/failed-detail.webp",
        id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
        object_path: "space/failed.webp",
        position: 1,
      },
    ];
    signedUrlMock.mockImplementation(async (path: string) =>
      path.includes("failed")
        ? { data: null, error: new Error("signing failed") }
        : { data: { signedUrl: `https://storage.example/${path}` }, error: null },
    );

    const detail = await getMemoryDetail(memory.id);

    expect(detail?.photos).toEqual([
      {
        coverUrl: "https://storage.example/space/cover-card.webp",
        detailUrl: "https://storage.example/space/cover-detail.webp",
        id: memory.coverPhotoId,
      },
      {
        coverUrl: null,
        detailUrl: null,
        id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
      },
    ]);
  });

  it("uses one original URL per legacy photo without variants", async () => {
    photosResult.data = [
      {
        cover_object_path: null,
        detail_object_path: null,
        id: memory.coverPhotoId,
        object_path: "space/original.webp",
        position: 0,
      },
    ];

    await expect(getMemoryDetail(memory.id)).resolves.toMatchObject({
      photos: [
        {
          coverUrl: "https://storage.example/space/original.webp",
          detailUrl: "https://storage.example/space/original.webp",
        },
      ],
    });
    expect(signedUrlMock).toHaveBeenCalledOnce();
  });

  it("throws a recoverable read failure for dependent database errors", async () => {
    photosResult.error = new Error("database unavailable");

    await expect(getMemoryDetail(memory.id)).rejects.toThrow("Failed to load the memory detail.");
  });
});
