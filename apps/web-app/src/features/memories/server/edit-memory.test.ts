import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createAdminClientMock,
  createClientMock,
  createGrantMock,
  getAvailableMemoryMock,
  validateInputMock,
  validatePhotoMock,
  verifyGrantMock,
} = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  createClientMock: vi.fn(),
  createGrantMock: vi.fn(() => "edit-grant"),
  getAvailableMemoryMock: vi.fn(),
  validateInputMock: vi.fn(),
  validatePhotoMock: vi.fn(),
  verifyGrantMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("./edit-memory-input", () => ({ validateEditMemoryFormData: validateInputMock }));
vi.mock("./get-available-memory", () => ({ getAvailableMemory: getAvailableMemoryMock }));
vi.mock("./memory-input-validation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./memory-input-validation")>()),
  validateMemoryPhotoBytes: validatePhotoMock,
}));
vi.mock("./memory-upload-grant", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./memory-upload-grant")>()),
  createMemoryUploadGrant: createGrantMock,
  verifyMemoryUploadGrant: verifyGrantMock,
}));

import { editMemory, prepareMemoryEdit } from "./edit-memory";
import { decodeMemoryVersion } from "./memory-version";

const ACTOR_ID = "authenticated-user";
const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const MUTATION_ID = "3ddf312a-e682-4cd8-91f9-9a2a230241ed";
const NEW_ID = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";
const RETAINED_ID = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";
const SPACE_ID = "561ecf16-cc9f-489c-ac1d-38fbfc35d97c";
const EXPECTED_UPDATED_AT = "2026-08-23T10:00:00.000Z";
const UPDATED_AT = "2026-08-23T11:00:00.000Z";

const validInput = {
  assetIds: [NEW_ID, RETAINED_ID],
  coverPhotoId: NEW_ID,
  description: "Updated description",
  expectedUpdatedAt: EXPECTED_UPDATED_AT,
  location: null,
  memoryDate: "2026-08-20",
  photos: [{ id: NEW_ID, name: "replacement.png" }],
  retainedPhotoIds: [RETAINED_ID],
  timezone: "UTC",
  title: "Updated title",
  visibility: "vault" as const,
};

function formData(): FormData {
  const value = new FormData();
  value.set("mutationId", MUTATION_ID);
  return value;
}

function grantPayload() {
  const basePath = `${SPACE_ID}/memories/${MEMORY_ID}/${NEW_ID}`;
  return {
    actorId: ACTOR_ID,
    coverAssetId: NEW_ID,
    description: validInput.description,
    expectedUpdatedAt: EXPECTED_UPDATED_AT,
    expiresAt: 1,
    finalAssetIds: validInput.assetIds,
    issuedAt: 1,
    location: null,
    memoryDate: validInput.memoryDate,
    memoryId: MEMORY_ID,
    mutationId: MUTATION_ID,
    newAssets: [
      {
        coverPath: `${basePath}/cover.webp`,
        detailPath: `${basePath}/detail.webp`,
        id: NEW_ID,
        name: "replacement.png",
        originalPath: `${basePath}/original`,
        temporaryPath: `${SPACE_ID}/temporary/${MUTATION_ID}/${NEW_ID}/original`,
      },
    ],
    operation: "edit" as const,
    retainedAssetIds: [RETAINED_ID],
    spaceId: SPACE_ID,
    timezone: "UTC",
    title: validInput.title,
    visibility: "vault" as const,
  };
}

function result(status: "completed" | "conflict" | "pending" | "unavailable") {
  return {
    memory_id: status === "completed" ? MEMORY_ID : null,
    status,
    updated_at: status === "completed" ? UPDATED_AT : null,
    visibility: status === "completed" ? ("vault" as const) : null,
  };
}

describe("stateless memory editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateInputMock.mockResolvedValue(validInput);
    getAvailableMemoryMock.mockResolvedValue({
      id: MEMORY_ID,
      spaceId: SPACE_ID,
      updatedAt: EXPECTED_UPDATED_AT,
    });
    createClientMock.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: { id: SPACE_ID }, error: null }),
    });
  });

  it("prepares signed temporary uploads for new assets and binds retained final order", async () => {
    const createSignedUploadUrl = vi.fn().mockResolvedValue({
      data: { token: "upload-token" },
      error: null,
    });
    createAdminClientMock.mockReturnValue({
      storage: { from: vi.fn(() => ({ createSignedUploadUrl })) },
    });

    await expect(prepareMemoryEdit(MEMORY_ID, formData(), ACTOR_ID)).resolves.toEqual({
      grant: "edit-grant",
      uploads: [
        {
          id: NEW_ID,
          path: `${SPACE_ID}/temporary/${MUTATION_ID}/${NEW_ID}/original`,
          token: "upload-token",
        },
      ],
    });
    expect(createSignedUploadUrl).toHaveBeenCalledWith(
      `${SPACE_ID}/temporary/${MUTATION_ID}/${NEW_ID}/original`,
      { upsert: true },
    );
    expect(createGrantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        finalAssetIds: [NEW_ID, RETAINED_ID],
        newAssets: [expect.objectContaining({ id: NEW_ID })],
        operation: "edit",
        retainedAssetIds: [RETAINED_ID],
      }),
    );
  });

  it("returns an already-completed mutation before accessing Storage", async () => {
    verifyGrantMock.mockReturnValue(grantPayload());
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: result("completed"), error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const storageFrom = vi.fn();
    createAdminClientMock.mockReturnValue({ rpc, storage: { from: storageFrom } });

    const edited = await editMemory(MEMORY_ID, "edit-grant", ACTOR_ID);

    expect(decodeMemoryVersion(edited.version)).toBe(UPDATED_AT);
    expect(storageFrom).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalledWith("finalize_memory_edit", expect.anything());
  });

  it.each(["conflict", "unavailable"] as const)(
    "returns the %s preflight outcome before accessing Storage",
    async (status) => {
      verifyGrantMock.mockReturnValue(grantPayload());
      const rpc = vi
        .fn()
        .mockResolvedValueOnce({ data: result(status), error: null })
        .mockResolvedValueOnce({ data: null, error: null });
      const storageFrom = vi.fn();
      createAdminClientMock.mockReturnValue({ rpc, storage: { from: storageFrom } });

      await expect(editMemory(MEMORY_ID, "edit-grant", ACTOR_ID)).rejects.toMatchObject({
        code: status,
      });
      expect(storageFrom).not.toHaveBeenCalled();
    },
  );

  it("validates new bytes and finalizes retained, reordered, new, and cover assets", async () => {
    const payload = grantPayload();
    verifyGrantMock.mockReturnValue(payload);
    validatePhotoMock.mockResolvedValue({
      contentType: "image/png",
      variants: { cover: Buffer.from("cover"), detail: Buffer.from("detail") },
    });
    const download = vi.fn().mockResolvedValue({
      data: { arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("original").buffer) },
      error: null,
    });
    const upload = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: result("pending"), error: null })
      .mockResolvedValueOnce({ data: result("completed"), error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    createAdminClientMock.mockReturnValue({
      rpc,
      storage: { from: vi.fn(() => ({ download, upload })) },
    });

    await expect(editMemory(MEMORY_ID, "edit-grant", ACTOR_ID)).resolves.toMatchObject({
      id: MEMORY_ID,
      visibility: "vault",
    });
    expect(download).toHaveBeenCalledWith(payload.newAssets[0].temporaryPath);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenCalledWith(
      "finalize_memory_edit",
      expect.objectContaining({
        p_assets: [
          expect.objectContaining({ asset_id: NEW_ID, is_cover: true, is_new: true, position: 0 }),
          { asset_id: RETAINED_ID, is_cover: false, is_new: false, position: 1 },
        ],
      }),
    );
  });

  it("rejects a route memory that differs from the signed edit grant", async () => {
    verifyGrantMock.mockReturnValue(grantPayload());

    await expect(editMemory(crypto.randomUUID(), "edit-grant", ACTOR_ID)).rejects.toMatchObject({
      code: "validation_failed",
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });
});
