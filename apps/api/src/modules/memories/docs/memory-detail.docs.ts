import type { SchemaObject } from "@nestjs/swagger";
import { MEMORY_LIST_ITEM_SCHEMA } from "./memory-list.docs";
import { MEMORY_REACTION_EXAMPLE, MEMORY_REACTION_SCHEMA } from "./memory-reactions.docs";

const signedUrl: SchemaObject = {
  type: "string",
  nullable: true,
  description:
    "Direct URL signed for 300 seconds, subject to earlier credential expiry. An issued URL can remain usable after access is revoked until expiry.",
};

export const MEMORY_DETAIL_SCHEMA: SchemaObject = {
  type: "object",
  required: [
    "id",
    "title",
    "memoryDate",
    "createdAt",
    "updatedAt",
    "description",
    "location",
    "visibility",
    "creatorDisplayName",
    "creatorAvatarUrl",
    "photos",
    "relatedMemories",
    "reaction",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string" },
    memoryDate: { type: "string", format: "date" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Exact database timestamp; send unchanged as lastKnownUpdatedAt for placement.",
    },
    description: { type: "string", nullable: true },
    location: { type: "string", nullable: true },
    visibility: { type: "string", enum: ["timeline", "vault"] },
    creatorDisplayName: { type: "string" },
    creatorAvatarUrl: { type: "string", nullable: true },
    photos: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "coverUrl", "detailUrl"],
        properties: {
          id: { type: "string", format: "uuid" },
          coverUrl: signedUrl,
          detailUrl: signedUrl,
        },
      },
    },
    relatedMemories: { type: "array", maxItems: 3, items: MEMORY_LIST_ITEM_SCHEMA },
    reaction: MEMORY_REACTION_SCHEMA,
  },
};

export const MEMORY_DETAIL_EXAMPLE = {
  id: "01900000-0000-7000-8000-000000000004",
  title: "A memory",
  memoryDate: "2026-10-01",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.123Z",
  description: null,
  location: null,
  visibility: "timeline",
  creatorDisplayName: "Sarah",
  creatorAvatarUrl: null,
  photos: [],
  relatedMemories: [],
  reaction: MEMORY_REACTION_EXAMPLE,
};
