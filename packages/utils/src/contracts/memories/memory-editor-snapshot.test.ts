import { describe, expect, it } from "vitest";
import { type MemoryEditSaveRequest, memoryEditSaveRequestSchema } from "./memory-edit-save";
import { type MemoryEditorSnapshot, memoryEditorSnapshotSchema } from "./memory-editor-snapshot";

const updatedAt = "2026-09-05T16:00:00.123000Z";
const photoId = "0199ceb0-0000-7000-8000-000000000001";
const uploadId = "0199ceb0-0000-7000-8000-000000000002";
const memoryId = "0199ceb0-0000-7000-8000-000000000003";

const snapshot: MemoryEditorSnapshot = {
  coverFileId: photoId,
  description: null,
  id: memoryId,
  location: null,
  memoryDate: "2026-08-20",
  photos: [{ id: photoId, previewUrl: null }],
  title: "Our picnic",
  updatedAt,
  visibility: "timeline",
};

const saveRequest: MemoryEditSaveRequest = {
  coverFileId: uploadId,
  description: null,
  lastKnownUpdatedAt: updatedAt,
  location: null,
  memoryDate: "2026-08-20",
  retainedPhotoIds: [photoId],
  timezone: "UTC",
  title: "Our picnic",
  uploadIds: [uploadId],
  visibility: "timeline",
};

describe("memory editor snapshot contract", () => {
  it("accepts ordered photos with nullable previews and no cover", () => {
    expect(
      memoryEditorSnapshotSchema.parse({ ...snapshot, coverFileId: null, photos: [] }),
    ).toEqual({
      ...snapshot,
      coverFileId: null,
      photos: [],
    });
  });

  it("rejects unknown fields and invalid identifiers", () => {
    expect(() => memoryEditorSnapshotSchema.parse({ ...snapshot, version: "1" })).toThrow();
    expect(() =>
      memoryEditorSnapshotSchema.parse({
        ...snapshot,
        photos: [{ id: "foreign", previewUrl: null }],
      }),
    ).toThrow();
    expect(() =>
      memoryEditorSnapshotSchema.parse({ ...snapshot, photos: [{ id: photoId, previewUrl: 1 }] }),
    ).toThrow();
    expect(() =>
      memoryEditorSnapshotSchema.parse({ ...snapshot, updatedAt: "2026-09-05" }),
    ).toThrow();
  });
});

describe("memory edit save request contract", () => {
  it("accepts an empty final selection with a null cover", () => {
    expect(
      memoryEditSaveRequestSchema.parse({
        ...saveRequest,
        coverFileId: null,
        retainedPhotoIds: [],
        uploadIds: [],
      }),
    ).toEqual({
      ...saveRequest,
      coverFileId: null,
      retainedPhotoIds: [],
      uploadIds: [],
    });
  });

  it("rejects unknown fields such as an edit idempotency key or storage paths", () => {
    expect(() =>
      memoryEditSaveRequestSchema.parse({ ...saveRequest, idempotencyKey: photoId }),
    ).toThrow();
    expect(() =>
      memoryEditSaveRequestSchema.parse({ ...saveRequest, temporaryPath: "memories/x/original" }),
    ).toThrow();
    expect(() =>
      memoryEditSaveRequestSchema.parse({ ...saveRequest, coverUploadId: uploadId }),
    ).toThrow();
  });

  it("rejects invalid identifiers, references, and timestamps", () => {
    expect(() =>
      memoryEditSaveRequestSchema.parse({ ...saveRequest, retainedPhotoIds: ["nope"] }),
    ).toThrow();
    expect(() =>
      memoryEditSaveRequestSchema.parse({ ...saveRequest, uploadIds: ["not-a-uuid"] }),
    ).toThrow();
    expect(() =>
      memoryEditSaveRequestSchema.parse({ ...saveRequest, lastKnownUpdatedAt: "2026-09-05" }),
    ).toThrow();
    expect(() =>
      memoryEditSaveRequestSchema.parse({ ...saveRequest, memoryDate: "not-a-date" }),
    ).toThrow();
    expect(() => memoryEditSaveRequestSchema.parse({ ...saveRequest, timezone: "" })).toThrow();
  });
});
