import type { SchemaObject } from "@nestjs/swagger";
import type { SettingsReadModel } from "../settings.types";

export const SETTINGS_EXAMPLE: SettingsReadModel = {
  account: { email: "alex@example.com", providerLabel: "Google" },
  activeMembers: [
    {
      avatarUrl: null,
      displayName: "Alex",
      id: "b7c9a143-7d2e-4b10-8f3a-53b9a08d40a1",
      isCurrentMember: true,
      joinedAt: "2026-07-22T12:00:00.000000Z",
      role: "owner",
      updatedAt: "2026-07-22T12:00:00.000000Z",
    },
  ],
  invite: { code: "lny7kmp2", expiresAt: "2026-07-23T12:00:00.000Z", isAvailable: true },
  membershipState: "one-member",
  space: {
    name: "Our shared space",
    startDate: "2026-07-22",
    updatedAt: "2026-07-22T12:00:00.000000Z",
  },
};

const REVISION: SchemaObject = { type: "string", format: "date-time" };
const NULLABLE_STRING: SchemaObject = { type: "string", nullable: true };

export const SETTINGS_SCHEMA: SchemaObject = {
  type: "object",
  nullable: true,
  required: ["account", "activeMembers", "invite", "membershipState", "space"],
  properties: {
    account: {
      type: "object",
      required: ["email", "providerLabel"],
      properties: {
        email: NULLABLE_STRING,
        providerLabel: NULLABLE_STRING,
      },
    },
    activeMembers: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: {
        type: "object",
        required: [
          "avatarUrl",
          "displayName",
          "id",
          "isCurrentMember",
          "joinedAt",
          "role",
          "updatedAt",
        ],
        properties: {
          avatarUrl: NULLABLE_STRING,
          displayName: { type: "string" },
          id: { type: "string", format: "uuid" },
          isCurrentMember: { type: "boolean" },
          joinedAt: REVISION,
          role: { type: "string", enum: ["owner", "partner"] },
          updatedAt: REVISION,
        },
      },
    },
    invite: {
      type: "object",
      required: ["code", "expiresAt", "isAvailable"],
      properties: {
        code: NULLABLE_STRING,
        expiresAt: { ...REVISION, nullable: true },
        isAvailable: { type: "boolean" },
      },
    },
    membershipState: { type: "string", enum: ["one-member", "two-member"] },
    space: {
      type: "object",
      required: ["name", "startDate", "updatedAt"],
      properties: {
        name: { type: "string" },
        startDate: { type: "string", format: "date" },
        updatedAt: REVISION,
      },
    },
  },
};
