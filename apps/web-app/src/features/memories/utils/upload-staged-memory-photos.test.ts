import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({ createClient: createClientMock }));

import type { MemoryEditorPhoto } from "../types/memory-editor";
import { uploadStagedMemoryPhotos } from "./upload-staged-memory-photos";

const PHOTO_ID = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";

describe("uploadStagedMemoryPhotos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads files directly to Supabase before sending metadata-only finalization", async () => {
    const file = new File(["image"], "memory.png", { type: "image/png" });
    const photo: MemoryEditorPhoto = {
      file,
      id: PHOTO_ID,
      key: `new-${PHOTO_ID}`,
      kind: "new",
      name: file.name,
      previewUrl: "blob:preview",
    };
    const formData = new FormData();
    formData.append("photoIds", PHOTO_ID);
    formData.append("photoNames", file.name);
    const finalResponse = Response.json({ id: "memory-id" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          result: null,
          uploads: [{ id: PHOTO_ID, path: "space/attempt/photo/original" }],
        }),
      )
      .mockResolvedValueOnce(finalResponse);
    vi.stubGlobal("fetch", fetchMock);
    const upload = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({ storage: { from: vi.fn(() => ({ upload })) } });

    await expect(
      uploadStagedMemoryPhotos({
        finalMethod: "POST",
        finalUrl: "/api/memories",
        formData,
        idempotencyKey: "request-id",
        photos: [photo],
        prepareUrl: "/api/memories/uploads",
      }),
    ).resolves.toBe(finalResponse);

    expect(upload).toHaveBeenCalledWith("space/attempt/photo/original", file, {
      contentType: "image/png",
      upsert: true,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/memories",
      expect.objectContaining({ body: formData, method: "POST" }),
    );
    expect(formData.getAll("photos")).toEqual([]);
  });

  it("skips preparation and storage for metadata-only mutations", async () => {
    const finalResponse = Response.json({ id: "memory-id" });
    const fetchMock = vi.fn().mockResolvedValue(finalResponse);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      uploadStagedMemoryPhotos({
        finalMethod: "PATCH",
        finalUrl: "/api/memories/memory-id/edit",
        formData: new FormData(),
        idempotencyKey: "request-id",
        photos: [],
        prepareUrl: "/api/memories/memory-id/edit/uploads",
      }),
    ).resolves.toBe(finalResponse);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
