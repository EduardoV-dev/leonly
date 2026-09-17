import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({ createClient: createClientMock }));

import type { MemoryEditorPhoto } from "../types/memory-editor";
import { uploadStagedMemoryPhotos } from "./upload-staged-memory-photos";

const ATTEMPT_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const PHOTO_ID = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";

function newPhoto(): Extract<MemoryEditorPhoto, { kind: "new" }> {
  const file = new File(["image"], "memory.png", { type: "image/png" });
  return {
    file,
    id: PHOTO_ID,
    key: `new-${PHOTO_ID}`,
    kind: "new",
    name: file.name,
    previewUrl: "blob:preview",
  };
}

describe("uploadStagedMemoryPhotos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("always prepares, uploads originals, and finalizes with only the attempt ID", async () => {
    const photo = newPhoto();
    const formData = new FormData();
    const finalResponse = Response.json({ id: "memory-id" });
    const prepared = {
      attemptId: ATTEMPT_ID,
      uploads: [{ id: PHOTO_ID, path: "space/attempt/photo/original" }],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(prepared))
      .mockResolvedValueOnce(finalResponse);
    vi.stubGlobal("fetch", fetchMock);
    const upload = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({ storage: { from: vi.fn(() => ({ upload })) } });
    const onPrepared = vi.fn();

    await expect(
      uploadStagedMemoryPhotos({
        attempt: null,
        finalMethod: "POST",
        finalUrl: "/api/memories",
        formData,
        onPrepared,
        photos: [photo],
        prepareUrl: "/api/memories/uploads",
      }),
    ).resolves.toBe(finalResponse);

    expect(onPrepared).toHaveBeenCalledWith(prepared);
    expect(upload).toHaveBeenCalledWith("space/attempt/photo/original", photo.file, {
      contentType: "image/png",
      upsert: true,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/memories", {
      body: JSON.stringify({ attemptId: ATTEMPT_ID }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  });

  it("prepares metadata-only mutations without initializing storage", async () => {
    const finalResponse = Response.json({ id: "memory-id" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ attemptId: ATTEMPT_ID, uploads: [] }))
      .mockResolvedValueOnce(finalResponse);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      uploadStagedMemoryPhotos({
        attempt: null,
        finalMethod: "PATCH",
        finalUrl: "/api/memories/memory-id/edit",
        formData: new FormData(),
        onPrepared: vi.fn(),
        photos: [],
        prepareUrl: "/api/memories/memory-id/edit/uploads",
      }),
    ).resolves.toBe(finalResponse);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("reuses the prepared attempt and upload descriptors after a recoverable failure", async () => {
    const photo = newPhoto();
    const attempt = {
      attemptId: ATTEMPT_ID,
      uploads: [{ id: PHOTO_ID, path: "space/attempt/photo/original" }],
    };
    const finalResponse = Response.json({ id: "memory-id" });
    const fetchMock = vi.fn().mockResolvedValue(finalResponse);
    vi.stubGlobal("fetch", fetchMock);
    const upload = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({ storage: { from: vi.fn(() => ({ upload })) } });

    await uploadStagedMemoryPhotos({
      attempt,
      finalMethod: "POST",
      finalUrl: "/api/memories",
      formData: new FormData(),
      onPrepared: vi.fn(),
      photos: [photo],
      prepareUrl: "/api/memories/uploads",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(upload).toHaveBeenCalledOnce();
  });
});
