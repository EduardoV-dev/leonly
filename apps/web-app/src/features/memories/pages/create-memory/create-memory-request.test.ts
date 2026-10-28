import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MemoryEditorPhoto, MemoryEditorValues } from "../../types/memory-editor";
import {
  MemoryCreationRequestError,
  type PreparedCreationUpload,
  submitMemoryCreation,
} from "./create-memory-request";

const postMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios/api", () => ({ api: { post: postMock } }));

const IDEMPOTENCY_KEY = "ab96e158-f605-4f35-a0a2-a2af3e39427e";
const UPLOAD_IDS = ["6b4588e1-c20b-43a3-8c01-71fa31fdc5fd", "1172d20f-1491-4a50-8b5c-19bba359c05a"];
const values: MemoryEditorValues = {
  title: "Our picnic",
  memoryDate: "2020-08-20",
  description: "A sunny day",
  location: "The park",
  visibility: "timeline",
};

function createPhotos(): MemoryEditorPhoto[] {
  return ["first.png", "second.webp"].map((name, index) => ({
    id: `local-${index}`,
    key: `photo-${index}`,
    name,
    kind: "new",
    file: new File([name], name),
    previewUrl: `blob:${name}`,
  }));
}

function createUploadResponse() {
  return {
    data: {
      ok: true,
      error: [],
      message: "Issued",
      data: {
        uploads: UPLOAD_IDS.map((id, index) => ({
          id,
          putUrl: `https://storage.example.com/staging/${id}`,
          requiredHeaders: { "Content-Type": index === 0 ? "image/png" : "image/webp" },
          expiresAt: "2030-01-01T00:10:00Z",
          attachmentDeadline: "2030-01-01T01:10:00Z",
        })),
      },
    },
  };
}

function createSuccessResponse() {
  return {
    data: {
      ok: true,
      error: [],
      message: "Saved",
      data: { id: "memory-id", visibility: "timeline" },
    },
  };
}

function createRequest() {
  return {
    values,
    photos: createPhotos(),
    coverPhotoKey: "photo-1",
    idempotencyKey: IDEMPOTENCY_KEY,
    preparedUpload: null,
    onPrepared: vi.fn<(upload: PreparedCreationUpload) => void>(),
  };
}

describe("JSON memory creation", () => {
  beforeEach(() => {
    postMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("issues a batch, uploads directly, and creates with server-issued identities in order", async () => {
    const request = createRequest();
    const sequence: string[] = [];
    postMock.mockImplementation(async (path: string) => {
      sequence.push(path);
      return path === "/files/uploads" ? createUploadResponse() : createSuccessResponse();
    });
    vi.mocked(fetch).mockImplementation(async () => {
      sequence.push("PUT");
      return new Response(null, { status: 200 });
    });

    await expect(submitMemoryCreation(request)).resolves.toEqual({
      id: "memory-id",
      visibility: "timeline",
    });
    expect(sequence).toEqual(["/files/uploads", "PUT", "PUT", "/memories"]);
    expect(postMock.mock.calls[0][1]).toEqual({
      purpose: "memory_image",
      files: [
        { filename: "first.png", contentType: "image/png", byteSize: 9 },
        { filename: "second.webp", contentType: "image/webp", byteSize: 11 },
      ],
    });
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `https://storage.example.com/staging/${UPLOAD_IDS[0]}`,
      expect.objectContaining({
        method: "PUT",
        body: request.photos[0].kind === "new" ? request.photos[0].file : undefined,
        headers: { "Content-Type": "image/png" },
        credentials: "omit",
      }),
    );
    expect(postMock.mock.calls[1][1]).toMatchObject({
      ...values,
      idempotencyKey: IDEMPOTENCY_KEY,
      uploadIds: UPLOAD_IDS,
      coverUploadId: UPLOAD_IDS[1],
    });
  });

  it("resumes a partial upload without issuing new identities or repeating successful PUTs", async () => {
    const request = createRequest();
    postMock
      .mockResolvedValueOnce(createUploadResponse())
      .mockResolvedValueOnce(createSuccessResponse());
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(submitMemoryCreation(request)).rejects.toThrow("Connection lost");
    const preparedUpload = request.onPrepared.mock.calls.at(-1)?.[0] ?? null;
    await expect(submitMemoryCreation({ ...request, preparedUpload })).resolves.toMatchObject({
      id: "memory-id",
    });
    expect(postMock).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      `https://storage.example.com/staging/${UPLOAD_IDS[0]}`,
      `https://storage.example.com/staging/${UPLOAD_IDS[1]}`,
      `https://storage.example.com/staging/${UPLOAD_IDS[1]}`,
    ]);
  });

  it("retries an uncertain creation response with the exact same key and uploads", async () => {
    const request = createRequest();
    postMock
      .mockResolvedValueOnce(createUploadResponse())
      .mockRejectedValueOnce(new Error("Response lost"))
      .mockResolvedValueOnce(createSuccessResponse());
    vi.mocked(fetch).mockImplementation(async () => new Response(null, { status: 200 }));

    await expect(submitMemoryCreation(request)).rejects.toThrow("Response lost");
    const preparedUpload = request.onPrepared.mock.calls.at(-1)?.[0] ?? null;
    const resolvedOptions = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...resolvedOptions,
      timeZone: "Pacific/Auckland",
    });
    await expect(submitMemoryCreation({ ...request, preparedUpload })).resolves.toMatchObject({
      id: "memory-id",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(postMock.mock.calls[1][1]).toEqual(postMock.mock.calls[2][1]);
    expect(postMock.mock.calls.map(([path]) => path)).toEqual([
      "/files/uploads",
      "/memories",
      "/memories",
    ]);
  });

  it("creates a photo-free memory without upload issuance or variant polling", async () => {
    postMock.mockResolvedValueOnce(createSuccessResponse());

    await expect(
      submitMemoryCreation({ ...createRequest(), photos: [], coverPhotoKey: null }),
    ).resolves.toMatchObject({ id: "memory-id" });
    expect(fetch).not.toHaveBeenCalled();
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock.mock.calls[0][1]).toMatchObject({ uploadIds: [], coverUploadId: null });
  });

  it("keeps API field errors and stops before uploading after rejected issuance", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        ok: false,
        data: null,
        message: "Invalid",
        error: [
          { code: "VALIDATION_ERROR", field: "files.0.filename", message: "Invalid filename" },
        ],
      },
    });

    await expect(submitMemoryCreation(createRequest())).rejects.toBeInstanceOf(
      MemoryCreationRequestError,
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(postMock).toHaveBeenCalledTimes(1);
  });
});
