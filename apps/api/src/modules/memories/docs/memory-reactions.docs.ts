import type { SchemaObject } from "@nestjs/swagger";

const types = ["heart", "laugh", "cry", "star"];

export const MEMORY_REACTION_SCHEMA: SchemaObject = {
  type: "object",
  required: ["counts", "currentReaction", "members"],
  properties: {
    counts: {
      type: "object",
      required: types,
      properties: Object.fromEntries(types.map((type) => [type, { type: "integer", minimum: 0 }])),
    },
    currentReaction: { type: "string", enum: types, nullable: true },
    members: {
      type: "object",
      required: types,
      properties: Object.fromEntries(
        types.map((type) => [type, { type: "array", items: { type: "string" } }]),
      ),
    },
  },
};

export const MEMORY_REACTION_EXAMPLE = {
  counts: { heart: 0, laugh: 0, cry: 0, star: 0 },
  currentReaction: null,
  members: { heart: [], laugh: [], cry: [], star: [] },
};
