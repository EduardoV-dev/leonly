import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryDetailService } from "./memory-detail.service";

const memoryId = "01900000-0000-7000-8000-000000000004";
const spaceId = "01900000-0000-7000-8000-000000000005";
const memberId = "01900000-0000-7000-8000-000000000006";
const date = new Date("2026-10-01T12:00:00Z");

describe("MemoryDetailService", () => {
  const membershipsService = { requireActiveMembership: vi.fn() };
  const memories = { findFirst: vi.fn(), findMany: vi.fn() };
  const signObject = vi.fn();
  const reactions = { getSummaries: vi.fn() };
  const service = new MemoryDetailService(
    { memory: memories } as never,
    { signObject } as never,
    membershipsService as never,
    reactions as never,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    membershipsService.requireActiveMembership.mockResolvedValue({ id: memberId, spaceId });
    const reaction = {
      counts: { heart: 0, laugh: 0, cry: 0, star: 0 },
      currentReaction: null,
      members: { heart: [], laugh: [], cry: [], star: [] },
    };
    reactions.getSummaries.mockImplementation(
      async ({ memoryIds }: { memoryIds: string[] }) =>
        new Map(memoryIds.map((id) => [id, reaction])),
    );
    memories.findMany.mockResolvedValue([]);
    signObject.mockImplementation(
      async ({ key }: { key: string }) => `https://storage.example/${key}`,
    );
    memories.findFirst.mockResolvedValue({
      id: memoryId,
      title: "A memory",
      memoryDate: date,
      createdAt: date,
      updatedAt: date,
      description: null,
      location: null,
      visibility: "timeline",
      coverFileId: "second",
      createdByMember: { displayName: "Sarah", user: { image: null } },
      memoryFiles: [
        { fileId: "first", file: { variants: [] } },
        { fileId: "second", file: { variants: [{ variantName: "detail", objectKey: "detail" }] } },
      ],
    });
  });

  it.each(["timeline", "vault"] as const)(
    "scopes %s detail and related reads",
    async (visibility) => {
      const result = await service.getDetail({ userId: "user", memoryId, visibility });
      expect(result.creatorDisplayName).toBe("Sarah");
      expect(result.photos).toEqual([
        { id: "second", coverUrl: null, detailUrl: "https://storage.example/detail" },
        { id: "first", coverUrl: null, detailUrl: null },
      ]);
      expect(signObject).toHaveBeenCalledWith({ key: "detail", expiresIn: 300 });
      expect(memories.findFirst.mock.calls[0][0].where).toMatchObject({
        id: memoryId,
        spaceId,
        visibility,
        deletedAt: null,
        space: {
          deletedAt: null,
          members: { some: { id: memberId, userId: "user", deletedAt: null } },
        },
      });
      expect(memories.findMany.mock.calls[0][0]).toMatchObject({
        where: { spaceId, visibility, deletedAt: null, id: { not: memoryId } },
        take: 3,
        orderBy: [{ memoryDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      });
    },
  );

  it("rejects missing membership or memory without querying relations", async () => {
    membershipsService.requireActiveMembership.mockRejectedValueOnce(new NotFoundException());
    await expect(
      service.getDetail({ userId: "user", memoryId, visibility: "timeline" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    memories.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.getDetail({ userId: "user", memoryId, visibility: "timeline" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(memories.findMany).not.toHaveBeenCalled();
    expect(signObject).not.toHaveBeenCalled();
  });

  it("propagates signing failures", async () => {
    signObject.mockRejectedValue(new Error("storage failed"));
    await expect(
      service.getDetail({ userId: "user", memoryId, visibility: "timeline" }),
    ).rejects.toThrow("storage failed");
  });

  it("propagates reaction lookup failures", async () => {
    reactions.getSummaries.mockRejectedValue(new Error("reaction lookup failed"));
    await expect(
      service.getDetail({ userId: "user", memoryId, visibility: "timeline" }),
    ).rejects.toThrow("reaction lookup failed");
  });

  it("signs related ready covers without exposing storage keys", async () => {
    const reaction = {
      counts: { heart: 1, laugh: 0, cry: 0, star: 0 },
      currentReaction: "heart",
      members: { heart: ["Sarah"], laugh: [], cry: [], star: [] },
    };
    reactions.getSummaries.mockImplementation(
      async ({ memoryIds }: { memoryIds: string[] }) =>
        new Map(memoryIds.map((id) => [id, reaction])),
    );
    memories.findMany.mockResolvedValue([
      {
        id: "related",
        title: "Another",
        memoryDate: date,
        createdAt: date,
        description: null,
        location: null,
        coverFile: { file: { variants: [{ objectKey: "related-cover" }] } },
      },
    ]);
    const result = await service.getDetail({ userId: "user", memoryId, visibility: "timeline" });
    expect(result.relatedMemories).toEqual([
      {
        id: "related",
        title: "Another",
        memoryDate: "2026-10-01",
        createdAt: date.toISOString(),
        description: null,
        location: null,
        coverPhotoUrl: "https://storage.example/related-cover",
        reaction,
      },
    ]);
    expect(signObject).toHaveBeenCalledWith({ key: "related-cover", expiresIn: 300 });
    expect(memories.findMany.mock.calls[0][0].where.space).toMatchObject({
      deletedAt: null,
      members: { some: { id: memberId, userId: "user", deletedAt: null } },
    });
    expect(
      memories.findFirst.mock.calls[0][0].select.memoryFiles.select.file.select.variants.where,
    ).toEqual({
      spaceId,
      status: "ready",
      variantName: { in: ["cover", "detail"] },
    });
  });
});
