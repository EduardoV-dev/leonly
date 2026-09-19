import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getMemoryDetail } from "./get-memory-detail";
import { getVaultMemoryDetail } from "./get-vault-memory-detail";

const {
  createClientMock,
  fromMock,
  getAvailableMemoryMock,
  getMemoryReactionSummaryMock,
  creatorResult,
  photosResult,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  fromMock: vi.fn(),
  getAvailableMemoryMock: vi.fn(),
  getMemoryReactionSummaryMock: vi.fn(),
  creatorResult: { data: null as unknown, error: null as unknown },
  photosResult: { data: null as unknown, error: null as unknown },
}));

vi.mock("./get-available-memory", () => ({ getAvailableMemory: getAvailableMemoryMock }));
vi.mock("./memory-reactions", () => ({
  getMemoryReactionSummary: getMemoryReactionSummaryMock,
  MemoryReactionError: class MemoryReactionError extends Error {},
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({ logServerError: vi.fn() }));

const memory = {
  coverPhotoId: "64d44f34-c5fe-482a-b65b-f91d0173b7fe",
  createdAt: "2026-08-23T10:00:00.000Z",
  creatorMembershipId: "e951cd4b-7567-4b1e-a5d3-18aa810cbd8e",
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
    getMemoryReactionSummaryMock.mockResolvedValue({
      counts: { cry: 0, heart: 0, laugh: 0, star: 0 },
      currentReaction: null,
    });
    fromMock.mockImplementation((table: string) =>
      table === "space_members" ? queryBuilder(creatorResult) : queryBuilder(photosResult),
    );
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "current-user" } } }),
      },
      from: fromMock,
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
      updatedAt: memory.updatedAt,
      visibility: "timeline",
    });

    getAvailableMemoryMock.mockResolvedValue({ ...memory, visibility: "vault" });
    await expect(getVaultMemoryDetail(memory.id)).resolves.toMatchObject({ visibility: "vault" });
  });

  it("resolves refreshed Timeline and Vault creator names without changing memory records", async () => {
    const timelineMemory = structuredClone(memory);
    const vaultMemory = { ...structuredClone(memory), visibility: "vault" as const };
    const originalTimelineMemory = structuredClone(timelineMemory);
    const originalVaultMemory = structuredClone(vaultMemory);

    getAvailableMemoryMock.mockResolvedValue(timelineMemory);
    await expect(getMemoryDetail(memory.id)).resolves.toMatchObject({
      creatorDisplayName: "Sarah",
      visibility: "timeline",
    });

    getAvailableMemoryMock.mockResolvedValue(vaultMemory);
    await expect(getVaultMemoryDetail(memory.id)).resolves.toMatchObject({
      creatorDisplayName: "Sarah",
      visibility: "vault",
    });

    creatorResult.data = {
      display_name: "Sarah Chen",
      users: { avatar_url: "https://avatars.example/sarah.jpg" },
    };

    getAvailableMemoryMock.mockResolvedValue(timelineMemory);
    await expect(getMemoryDetail(memory.id)).resolves.toMatchObject({
      creatorDisplayName: "Sarah Chen",
      visibility: "timeline",
    });

    getAvailableMemoryMock.mockResolvedValue(vaultMemory);
    await expect(getVaultMemoryDetail(memory.id)).resolves.toMatchObject({
      creatorDisplayName: "Sarah Chen",
      visibility: "vault",
    });
    expect(timelineMemory).toEqual(originalTimelineMemory);
    expect(vaultMemory).toEqual(originalVaultMemory);
  });

  it("does not load dependent data when the memory belongs to another detail route", async () => {
    getAvailableMemoryMock.mockResolvedValue({ ...memory, visibility: "vault" });

    await expect(getMemoryDetail(memory.id)).resolves.toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("promotes the cover and keeps the remaining persisted order", async () => {
    photosResult.data = [
      {
        id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
        position: 0,
      },
      {
        id: "cc2df916-833a-4f1b-b744-b7b4c176ae93",
        position: 1,
      },
      {
        id: memory.coverPhotoId,
        position: 2,
      },
    ];

    const detail = await getMemoryDetail(memory.id);

    expect(detail?.photos.map((photo) => photo.id)).toEqual([
      memory.coverPhotoId,
      "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
      "cc2df916-833a-4f1b-b744-b7b4c176ae93",
    ]);
    expect(fromMock).toHaveBeenCalledWith("memory_assets");
  });

  it("projects only opaque cover and detail route URLs", async () => {
    photosResult.data = [
      {
        id: memory.coverPhotoId,
        position: 0,
      },
      {
        id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
        position: 1,
      },
    ];
    const detail = await getMemoryDetail(memory.id);

    expect(detail?.photos).toEqual([
      {
        coverUrl: `/api/memories/${memory.id}/photos/${memory.coverPhotoId}/cover`,
        detailUrl: `/api/memories/${memory.id}/photos/${memory.coverPhotoId}/detail`,
        id: memory.coverPhotoId,
      },
      {
        coverUrl: `/api/memories/${memory.id}/photos/2505a6a1-0d34-48f7-8d0d-e7cf9a62e452/cover`,
        detailUrl: `/api/memories/${memory.id}/photos/2505a6a1-0d34-48f7-8d0d-e7cf9a62e452/detail`,
        id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
      },
    ]);
    expect(JSON.stringify(detail?.photos)).not.toContain("space/");
    expect(JSON.stringify(detail?.photos)).not.toContain("storage");
  });

  it("throws a recoverable read failure for dependent database errors", async () => {
    photosResult.error = new Error("database unavailable");

    await expect(getMemoryDetail(memory.id)).rejects.toThrow("Failed to load the memory detail.");
  });
});
