import type { SchemaObject } from "@nestjs/swagger";

const itemSchema: SchemaObject = {
  type: "object",
  required: ["id", "title", "memoryDate", "createdAt", "description", "location", "coverPhotoUrl"],
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string" },
    memoryDate: { type: "string", format: "date" },
    createdAt: { type: "string", format: "date-time" },
    description: { type: "string", nullable: true },
    location: { type: "string", nullable: true },
    coverPhotoUrl: {
      type: "string",
      nullable: true,
      description:
        "Direct storage GET URL signed for five minutes, or null when no cover is ready. Signing credentials may expire earlier. Anyone holding the URL can use it until effective expiry, even after access is revoked.",
    },
  },
};

export const MEMORY_LIST_SCHEMA: SchemaObject = {
  type: "object",
  required: ["data", "meta"],
  properties: {
    data: { type: "array", items: itemSchema },
    meta: {
      type: "object",
      required: ["nextCursor", "cursorReset"],
      properties: {
        nextCursor: { type: "string", nullable: true },
        cursorReset: {
          type: "boolean",
          description: "True when a stale anchor or sort change caused a first-page reset.",
        },
      },
    },
  },
};

export const MEMORY_LIST_EXAMPLE = { data: [], meta: { nextCursor: null, cursorReset: false } };
