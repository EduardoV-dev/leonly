import type { SchemaObject } from "@nestjs/swagger";

export const SPACE_ID_SCHEMA: SchemaObject = {
  type: "object",
  required: ["space_id"],
  properties: { space_id: { type: "string", format: "uuid" } },
};

export const SPACE_ID_EXAMPLE = { space_id: "0199a9aa-1234-7000-8000-111111111111" };

export const ACTIVE_SPACE_SCHEMA: SchemaObject = {
  type: "object",
  nullable: true,
  required: [
    "active_members",
    "id",
    "invite_code",
    "invite_code_expires_at",
    "member_names",
    "name",
    "onboarding_completed_at",
    "start_date",
  ],
  properties: {
    active_members: {
      type: "array",
      items: {
        type: "object",
        required: ["avatar_url", "display_name"],
        properties: {
          avatar_url: { type: "string", nullable: true },
          display_name: { type: "string" },
        },
      },
    },
    id: { type: "string", format: "uuid" },
    invite_code: { type: "string", nullable: true },
    invite_code_expires_at: { type: "string", format: "date-time", nullable: true },
    member_names: { type: "array", items: { type: "string" } },
    name: { type: "string" },
    onboarding_completed_at: { type: "string", format: "date-time", nullable: true },
    start_date: { type: "string", format: "date" },
  },
};

export const ACTIVE_SPACE_EXAMPLE = {
  active_members: [{ avatar_url: null, display_name: "Leo" }],
  id: SPACE_ID_EXAMPLE.space_id,
  invite_code: "leoabcde",
  invite_code_expires_at: "2026-10-03T12:00:00.000Z",
  member_names: ["Leo"],
  name: "Forever Us",
  onboarding_completed_at: null,
  start_date: "2026-07-22",
};
