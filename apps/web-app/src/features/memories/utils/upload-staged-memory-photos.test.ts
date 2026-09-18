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

  it("uses a signed URL for create originals and finalizes with the grant", async () => {
    const photo = newPhoto();
    const formData = new FormData();
    const finalResponse = Response.json({ id: "memory-id" });
    const prepared = {
      grant: "signed-grant",
      uploads: [{ id: PHOTO_ID, path: "space/temporary/photo/original", token: "upload-token" }],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(prepared))
      .mockResolvedValueOnce(finalResponse);
    vi.stubGlobal("fetch", fetchMock);
    const upload = vi.fn();
    const uploadToSignedUrl = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({
      storage: { from: vi.fn(() => ({ upload, uploadToSignedUrl })) },
    });
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
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      "space/temporary/photo/original",
      "upload-token",
      photo.file,
      {
        contentType: "image/png",
      },
    );
    expect(upload).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/memories", {
      body: JSON.stringify({ grant: "signed-grant" }),
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

  it("retains a signed grant before a partial failure and reattempts temporary uploads", async () => {
    const photo = newPhoto();
    const prepared = {
      grant: "signed-grant",
      uploads: [
        {
          id: PHOTO_ID,
          path: "space/temporary/mutation/photo/original",
          token: "upload-token",
        },
      ],
    };
    const finalResponse = Response.json({ id: "memory-id" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(prepared))
      .mockResolvedValue(finalResponse);
    vi.stubGlobal("fetch", fetchMock);
    const uploadToSignedUrl = vi
      .fn()
      .mockResolvedValueOnce({ error: new Error("interrupted") })
      .mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({
      storage: { from: vi.fn(() => ({ uploadToSignedUrl })) },
    });
    const onPrepared = vi.fn();

    const options = {
      attempt: null,
      finalMethod: "POST" as const,
      finalUrl: "/api/memories",
      formData: new FormData(),
      onPrepared,
      photos: [photo],
      prepareUrl: "/api/memories/uploads",
    };
    await expect(uploadStagedMemoryPhotos(options)).rejects.toThrow("could not be uploaded");

    expect(onPrepared).toHaveBeenCalledWith(prepared);
    expect(onPrepared.mock.invocationCallOrder[0]).toBeLessThan(
      uploadToSignedUrl.mock.invocationCallOrder[0],
    );
    await expect(
      uploadStagedMemoryPhotos({
        ...options,
        attempt: prepared,
      }),
    ).resolves.toBe(finalResponse);

    expect(uploadToSignedUrl).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/memories", {
      body: JSON.stringify({ grant: "signed-grant" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  });
});
