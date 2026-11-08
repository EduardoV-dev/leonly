import type { SchemaObject } from "@nestjs/swagger";

const baseProperties: SchemaObject["properties"] = {
  id: { type: "string", format: "uuid" },
  memoryId: { type: "string", format: "uuid" },
  createdAt: { type: "string", format: "date-time" },
  replyCount: { type: "integer", minimum: 0 },
};

export const COMMENT_SCHEMA: SchemaObject = {
  type: "object",
  required: [
    "deletedAt",
    "id",
    "memoryId",
    "createdAt",
    "updatedAt",
    "parentCommentId",
    "replyCount",
    "body",
    "authorDisplayName",
    "authorAvatarUrl",
    "isAuthor",
  ],
  properties: {
    ...baseProperties,
    deletedAt: { type: "string", format: "date-time", nullable: true, enum: [null] },
    parentCommentId: { type: "string", format: "uuid", nullable: true },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Preserve all fractional digits when editing or deleting.",
    },
    body: { type: "string" },
    authorDisplayName: { type: "string" },
    authorAvatarUrl: { type: "string", nullable: true },
    isAuthor: { type: "boolean" },
  },
};

const PLACEHOLDER_SCHEMA: SchemaObject = {
  type: "object",
  required: ["deletedAt", "id", "memoryId", "createdAt", "replyCount"],
  properties: { ...baseProperties, deletedAt: { type: "string", format: "date-time" } },
};

export const COMMENT_PAGE_SCHEMA: SchemaObject = {
  type: "object",
  required: ["data", "meta"],
  properties: {
    data: { type: "array", items: { oneOf: [COMMENT_SCHEMA, PLACEHOLDER_SCHEMA] } },
    meta: {
      type: "object",
      required: ["nextCursor", "resetCursor"],
      properties: {
        nextCursor: { type: "string", nullable: true },
        resetCursor: {
          type: "boolean",
          description: "Discard accumulated pages and restart when true.",
        },
      },
    },
  },
};

export const COMMENT_EXAMPLE = {
  deletedAt: null,
  id: "01900000-0000-7000-8000-000000000005",
  memoryId: "01900000-0000-7000-8000-000000000004",
  parentCommentId: null,
  createdAt: "2026-09-05T16:00:00.123456Z",
  updatedAt: "2026-09-05T16:00:00.123456Z",
  replyCount: 0,
  body: "A lovely day",
  authorDisplayName: "Leo",
  authorAvatarUrl: null,
  isAuthor: true,
};
