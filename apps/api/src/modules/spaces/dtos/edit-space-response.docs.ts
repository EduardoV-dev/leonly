import type { SchemaObject } from "@nestjs/swagger";

const REVISION: SchemaObject = { type: "string", format: "date-time" };

export const INVITE_SCHEMA: SchemaObject = {
  type: "object",
  required: ["invite_code", "invite_code_expires_at"],
  properties: {
    invite_code: { type: "string" },
    invite_code_expires_at: REVISION,
  },
};
