import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryEditService } from "./memory-edit.service";

describe("editable memory snapshot", () => {
  const memoryId = "01900000-0000-7000-8000-000000000004";
  const spaceId = "01900000-0000-7000-8000-000000000005";
  const memberId = "01900000-0000-7000-8000-000000000006";
  const updatedAt = new Date("2026-09-05T16:00:00.123Z");
  const editableMemory = {
    id: memoryId,
    title: "Our picnic",
    description: null,
    location: null,
    memoryDate: new Date("2026-08-20T00:00:00.000Z"),
    visibility: "vault",
    updatedAt,
    coverFileId: "photo-ready",
    memoryFiles: [
      {
        fileId: "photo-ready",
        file: { status: "ready", variants: [{ objectKey: "detail-key" }] },
      },
      { fileId: "photo-pending", file: { status: "uploaded", variants: [] } },
      { fileId: "photo-retired", file: { status: "deleting", variants: [{ objectKey: "stale" }] } },
    ],
  };

  const membershipsService = { requireActiveMembership: vi.fn() };
  const memories = { findFirst: vi.fn() };
  const signObject = vi.fn();
  const service = new MemoryEditService(
    { memory: memories } as never,
    {} as never,
    {} as never,
    membershipsService as never,
    {} as never,
    { signObject } as never,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    membershipsService.requireActiveMembership.mockResolvedValue({ id: memberId, spaceId });
    signObject.mockImplementation(async ({ key }: { key: string }) => `https://signed/${key}`);
    memories.findFirst.mockResolvedValue(editableMemory);
  });

  it.each(["timeline", "vault"] as const)(
    "loads a %s memory without a placement filter and preserves persisted order",
    async (visibility) => {
      memories.findFirst.mockImplementation(
        async ({ where }: { where: { visibility?: unknown } }) =>
          where.visibility === undefined ? { ...editableMemory, visibility } : null,
      );

      const snapshot = await service.getEditableSnapshot({ userId: "user-a", memoryId });

      const where = memories.findFirst.mock.calls[0][0].where;
      expect(where).not.toHaveProperty("visibility");
      expect(snapshot.visibility).toBe(visibility);
      expect(snapshot.photos.map(({ id }) => id)).toEqual([
        "photo-ready",
        "photo-pending",
        "photo-retired",
      ]);
    },
  );

  it("returns the cover identity, exact timestamp, and signed previews for serving files", async () => {
    const snapshot = await service.getEditableSnapshot({ userId: "user-a", memoryId });

    expect(snapshot.coverFileId).toBe("photo-ready");
    expect(snapshot.updatedAt).toBe(updatedAt.toISOString());
    expect(snapshot.memoryDate).toBe("2026-08-20");
    expect(snapshot.photos).toEqual([
      { id: "photo-ready", previewUrl: "https://signed/detail-key" },
      { id: "photo-pending", previewUrl: null },
      { id: "photo-retired", previewUrl: null },
    ]);
    expect(signObject).toHaveBeenCalledTimes(1);
    expect(signObject).toHaveBeenCalledWith({ key: "detail-key", expiresIn: 300 });
    expect(JSON.stringify(snapshot)).not.toContain("objectKey");
  });

  it("returns generic not-found without signing when the memory is unavailable", async () => {
    memories.findFirst.mockResolvedValue(null);

    await expect(service.getEditableSnapshot({ userId: "user-a", memoryId })).rejects.toMatchObject(
      { status: 404 },
    );
    expect(signObject).not.toHaveBeenCalled();
  });

  it("requires an active membership before any memory lookup", async () => {
    membershipsService.requireActiveMembership.mockRejectedValue(
      new NotFoundException({ error: "An active space is required." }),
    );

    await expect(
      service.getEditableSnapshot({ userId: "user-a", memoryId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(memories.findFirst).not.toHaveBeenCalled();
  });

  it("surfaces unexpected lookup failures without signing", async () => {
    memories.findFirst.mockRejectedValue(new Error("private database detail"));

    await expect(service.getEditableSnapshot({ userId: "user-a", memoryId })).rejects.toThrow(
      "private database detail",
    );
    expect(signObject).not.toHaveBeenCalled();
  });
});
