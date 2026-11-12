import type { SchemaObject } from "@nestjs/swagger";

const signedPreview: SchemaObject = {
  type: "string",
  nullable: true,
  description:
    "Direct GET URL signed for 300 seconds, subject to earlier credential expiry; null while the photo has no ready preview variant. An issued URL can remain usable after the photo is removed until expiry.",
};

const editorPhoto: SchemaObject = {
  type: "object",
  required: ["id", "previewUrl"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Attached root photo ID in persisted order.",
    },
    previewUrl: signedPreview,
  },
};

export const MEMORY_EDITOR_SNAPSHOT_SCHEMA: SchemaObject = {
  type: "object",
  required: [
    "id",
    "title",
    "description",
    "location",
    "memoryDate",
    "visibility",
    "updatedAt",
    "coverFileId",
    "photos",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string" },
    description: { type: "string", nullable: true },
    location: { type: "string", nullable: true },
    memoryDate: { type: "string", format: "date" },
    visibility: { type: "string", enum: ["timeline", "vault"] },
    updatedAt: {
      type: "string",
      format: "date-time",
      description:
        "Exact database timestamp; send it unchanged as lastKnownUpdatedAt when saving the edit.",
    },
    coverFileId: {
      type: "string",
      format: "uuid",
      nullable: true,
      description: "Currently selected cover photo ID; null when the memory has no cover.",
    },
    photos: {
      type: "array",
      description: "All attached photos in persisted position order, not cover-first detail order.",
      items: editorPhoto,
    },
  },
};

export const MEMORY_EDITOR_SNAPSHOT_EXAMPLE = {
  id: "01900000-0000-7000-8000-000000000004",
  title: "Our picnic",
  description: null,
  location: "Lakeside park",
  memoryDate: "2026-08-20",
  visibility: "timeline",
  updatedAt: "2026-09-05T16:00:00.123Z",
  coverFileId: "01900000-0000-7000-8000-000000000006",
  photos: [
    {
      id: "01900000-0000-7000-8000-000000000006",
      previewUrl: "https://storage.example.com/signed-get",
    },
    { id: "01900000-0000-7000-8000-000000000007", previewUrl: null },
  ],
};

export const MEMORY_EDIT_SAVE_RESULT_EXAMPLE = {
  id: "01900000-0000-7000-8000-000000000004",
  visibility: "timeline",
  updatedAt: "2026-09-05T16:00:00.123456Z",
};
