import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/constants/environment-variables", () => ({
  ENVIRONMENT_VARIABLES: { SUPABASE_SERVICE_ROLE_KEY: "test-service-role-secret" },
}));

import { createMemoryUploadGrant, verifyMemoryUploadGrant } from "./memory-upload-grant";

const ACTOR_ID = "auth-user-id";
const ASSET_ID = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";
const MEMORY_ID = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";
const MUTATION_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const SPACE_ID = "561ecf16-cc9f-489c-ac1d-38fbfc35d97c";
const NOW = Date.UTC(2026, 8, 17, 12);

function grant(): string {
  const basePath = `${SPACE_ID}/memories/${MEMORY_ID}/${ASSET_ID}`;
  return createMemoryUploadGrant(
    {
      actorId: ACTOR_ID,
      assets: [
        {
          coverPath: `${basePath}/cover.webp`,
          detailPath: `${basePath}/detail.webp`,
          id: ASSET_ID,
          isCover: true,
          name: "memory.png",
          originalPath: `${basePath}/original`,
          position: 0,
          temporaryPath: `${SPACE_ID}/temporary/${MUTATION_ID}/${ASSET_ID}/original`,
        },
      ],
      description: null,
      location: null,
      memoryDate: "2026-09-16",
      memoryId: MEMORY_ID,
      mutationId: MUTATION_ID,
      operation: "create",
      spaceId: SPACE_ID,
      timezone: "UTC",
      title: "Our picnic",
      visibility: "timeline",
    },
    NOW,
  );
}

describe("memory upload grants", () => {
  beforeEach(() => vi.clearAllMocks());

  it("round-trips a signed create payload", () => {
    expect(verifyMemoryUploadGrant(grant(), ACTOR_ID, "create", NOW)).toMatchObject({
      actorId: ACTOR_ID,
      memoryId: MEMORY_ID,
      mutationId: MUTATION_ID,
      operation: "create",
      spaceId: SPACE_ID,
    });
  });

  it("rejects tampering", () => {
    const value = grant();
    const tampered = `${value.slice(0, -1)}${value.endsWith("a") ? "b" : "a"}`;
    expect(() => verifyMemoryUploadGrant(tampered, ACTOR_ID, "create", NOW)).toThrow("invalid");
  });

  it("rejects an expired grant", () => {
    expect(() =>
      verifyMemoryUploadGrant(grant(), ACTOR_ID, "create", NOW + 11 * 60 * 1000),
    ).toThrow("expired");
  });

  it("rejects a different authenticated actor", () => {
    expect(() => verifyMemoryUploadGrant(grant(), "other-user", "create", NOW)).toThrow("invalid");
  });

  it("round-trips an edit payload and rejects an operation mismatch", () => {
    const basePath = `${SPACE_ID}/memories/${MEMORY_ID}/${ASSET_ID}`;
    const editGrant = createMemoryUploadGrant(
      {
        actorId: ACTOR_ID,
        coverAssetId: ASSET_ID,
        description: "Updated",
        expectedUpdatedAt: "2026-09-17T11:00:00.000Z",
        finalAssetIds: [ASSET_ID],
        location: null,
        memoryDate: "2026-09-16",
        memoryId: MEMORY_ID,
        mutationId: MUTATION_ID,
        newAssets: [
          {
            coverPath: `${basePath}/cover.webp`,
            detailPath: `${basePath}/detail.webp`,
            id: ASSET_ID,
            name: "replacement.png",
            originalPath: `${basePath}/original`,
            temporaryPath: `${SPACE_ID}/temporary/${MUTATION_ID}/${ASSET_ID}/original`,
          },
        ],
        operation: "edit",
        retainedAssetIds: [],
        spaceId: SPACE_ID,
        timezone: "UTC",
        title: "Updated picnic",
        visibility: "vault",
      },
      NOW,
    );

    expect(verifyMemoryUploadGrant(editGrant, ACTOR_ID, "edit", NOW)).toMatchObject({
      finalAssetIds: [ASSET_ID],
      operation: "edit",
    });
    expect(() => verifyMemoryUploadGrant(editGrant, ACTOR_ID, "create", NOW)).toThrow("invalid");
  });

  it("rejects malformed edit paths and selections before signing", () => {
    expect(() =>
      createMemoryUploadGrant({
        actorId: ACTOR_ID,
        coverAssetId: ASSET_ID,
        description: null,
        expectedUpdatedAt: "2026-09-17T11:00:00.000Z",
        finalAssetIds: [ASSET_ID],
        location: null,
        memoryDate: "2026-09-16",
        memoryId: MEMORY_ID,
        mutationId: MUTATION_ID,
        newAssets: [],
        operation: "edit",
        retainedAssetIds: [],
        spaceId: SPACE_ID,
        timezone: "UTC",
        title: "Updated picnic",
        visibility: "vault",
      }),
    ).toThrow();
  });
});
