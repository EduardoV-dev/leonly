import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MemoryEditResult } from "../types/memory-edit";
import { validateEditMemoryFormData } from "./edit-memory-input";
import { getAvailableMemory } from "./get-available-memory";
import { MemoryInputError, validateMemoryPhotoBytes } from "./memory-input-validation";
import {
  createMemoryUploadGrant,
  type EditMemoryUploadGrantAsset,
  type EditMemoryUploadGrantPayload,
  MemoryUploadGrantError,
  verifyMemoryUploadGrant,
} from "./memory-upload-grant";
import { uploadMemoryObjectIfAbsentOrIdentical } from "./memory-upload-storage";
import { encodeMemoryVersion } from "./memory-version";

const uuidSchema = z.uuid();
const activeSpaceSchema = z.object({ id: z.uuid() });
const editResultSchema = z
  .object({
    memory_id: z.uuid().nullable(),
    status: z.enum([
      "cleanup_pending",
      "completed",
      "conflict",
      "invalid",
      "mismatch",
      "pending",
      "unavailable",
    ]),
    updated_at: z.string().nullable(),
    visibility: z.enum(["timeline", "vault"]).nullable(),
  })
  .strict();

type PreparedMemoryEdit = {
  grant: string;
  uploads: Array<{ id: string; path: string; token: string }>;
};

type FinalizedNewAsset = {
  asset_id: string;
  cover_byte_size: number;
  cover_path: string;
  detail_byte_size: number;
  detail_path: string;
  is_cover: boolean;
  is_new: true;
  original_byte_size: number;
  original_content_type: string;
  original_path: string;
  position: number;
  temporary_path: string;
};

export type EditMemoryErrorCode = "conflict" | "pending" | "unavailable";

export class EditMemoryError extends MemoryInputError {
  constructor(
    message: string,
    fields: Record<string, string>,
    status: number,
    readonly code: EditMemoryErrorCode,
    options?: ErrorOptions,
  ) {
    super(message, fields, status, undefined, options);
  }
}

function unavailable(): never {
  throw new EditMemoryError("This memory is unavailable.", {}, 404, "unavailable");
}

function conflict(): never {
  throw new EditMemoryError(
    "This memory changed. Reload the current version before saving.",
    {},
    409,
    "conflict",
  );
}

function invalidGrant(error?: unknown): never {
  throw new MemoryInputError(
    "Please review the highlighted fields.",
    { photos: "One or more selected photos are unavailable." },
    400,
    "validation_failed",
    { cause: error },
  );
}

function selection(payload: EditMemoryUploadGrantPayload) {
  const newAssets = new Map(payload.newAssets.map((asset) => [asset.id, asset]));
  return payload.finalAssetIds.map((id, position) => {
    const asset = newAssets.get(id);
    return {
      asset_id: id,
      cover_path: asset?.coverPath ?? null,
      detail_path: asset?.detailPath ?? null,
      is_cover: id === payload.coverAssetId,
      is_new: Boolean(asset),
      original_path: asset?.originalPath ?? null,
      position,
      temporary_path: asset?.temporaryPath ?? null,
    };
  });
}

function editParameters(payload: EditMemoryUploadGrantPayload) {
  return {
    p_actor_subject: payload.actorId,
    p_assets: selection(payload),
    p_description: payload.description,
    p_expected_updated_at: payload.expectedUpdatedAt,
    p_location: payload.location,
    p_memory_date: payload.memoryDate,
    p_memory_id: payload.memoryId,
    p_mutation_id: payload.mutationId,
    p_space_id: payload.spaceId,
    p_title: payload.title,
    p_visibility: payload.visibility,
  };
}

async function enqueueEditCleanup(
  payload: EditMemoryUploadGrantPayload,
  includePermanentPaths: boolean,
): Promise<void> {
  await createAdminClient().rpc("enqueue_memory_edit_cleanup", {
    p_actor_subject: payload.actorId,
    p_memory_id: payload.memoryId,
    p_mutation_id: payload.mutationId,
    p_paths: payload.newAssets.flatMap((asset) => [
      asset.temporaryPath,
      ...(includePermanentPaths ? [asset.originalPath, asset.coverPath, asset.detailPath] : []),
    ]),
  });
}

function handleOutcome(status: string): never {
  if (status === "unavailable") unavailable();
  if (status === "conflict") conflict();
  if (status === "cleanup_pending") {
    throw new EditMemoryError(
      "We are finishing a previous photo update. Please try again.",
      {},
      503,
      "pending",
    );
  }
  invalidGrant();
}

export async function prepareMemoryEdit(
  memoryId: string,
  formData: FormData,
  actorId: string,
): Promise<PreparedMemoryEdit> {
  if (!uuidSchema.safeParse(memoryId).success) unavailable();
  const input = await validateEditMemoryFormData(formData);
  const mutationId = uuidSchema.safeParse(formData.get("mutationId"));
  if (!mutationId.success) invalidGrant();

  const memory = await getAvailableMemory(memoryId);
  if (!memory) unavailable();
  if (memory.updatedAt !== input.expectedUpdatedAt) conflict();

  const supabase = await createClient();
  const activeSpace = await supabase.rpc("get_active_space");
  const parsedSpace = activeSpaceSchema.safeParse(activeSpace.data);
  if (activeSpace.error) {
    throw new Error("Unable to resolve the active space.", { cause: activeSpace.error });
  }
  if (!parsedSpace.success || parsedSpace.data.id !== memory.spaceId) unavailable();

  const newAssets: EditMemoryUploadGrantAsset[] = input.photos.map((photo) => {
    const basePath = `${memory.spaceId}/memories/${memoryId}/${photo.id}`;
    return {
      coverPath: `${basePath}/cover.webp`,
      detailPath: `${basePath}/detail.webp`,
      id: photo.id,
      name: photo.name,
      originalPath: `${basePath}/original`,
      temporaryPath: `${memory.spaceId}/temporary/${mutationId.data}/${photo.id}/original`,
    };
  });
  const grant = createMemoryUploadGrant({
    actorId,
    coverAssetId: input.coverPhotoId,
    description: input.description,
    expectedUpdatedAt: input.expectedUpdatedAt,
    finalAssetIds: input.assetIds,
    location: input.location,
    memoryDate: input.memoryDate,
    memoryId,
    mutationId: mutationId.data,
    newAssets,
    operation: "edit",
    retainedAssetIds: input.retainedPhotoIds,
    spaceId: memory.spaceId,
    timezone: input.timezone,
    title: input.title,
    visibility: input.visibility,
  });

  const admin = createAdminClient();
  const uploads = await Promise.all(
    newAssets.map(async (asset) => {
      const signed = await admin.storage
        .from("memory-photos")
        .createSignedUploadUrl(asset.temporaryPath, { upsert: true });
      if (signed.error || !signed.data?.token) {
        throw new Error("Unable to create a signed memory upload.", { cause: signed.error });
      }
      return { id: asset.id, path: asset.temporaryPath, token: signed.data.token };
    }),
  );
  return { grant, uploads };
}

export async function editMemory(
  memoryId: string,
  grant: string,
  actorId: string,
): Promise<MemoryEditResult> {
  let payload: EditMemoryUploadGrantPayload;
  try {
    const verified = verifyMemoryUploadGrant(grant, actorId, "edit");
    if (verified.operation !== "edit" || verified.memoryId !== memoryId) invalidGrant();
    payload = verified;
  } catch (error) {
    if (error instanceof MemoryUploadGrantError) invalidGrant(error);
    throw error;
  }

  try {
    const admin = createAdminClient();
    const preflight = await admin.rpc("get_memory_edit_result", editParameters(payload));
    const parsedPreflight = editResultSchema.safeParse(preflight.data);
    if (preflight.error || !parsedPreflight.success) {
      await enqueueEditCleanup(payload, true).catch(() => undefined);
      throw new Error("Unable to check memory edit status.", { cause: preflight.error });
    }
    if (
      parsedPreflight.data.status === "completed" &&
      parsedPreflight.data.memory_id &&
      parsedPreflight.data.updated_at &&
      parsedPreflight.data.visibility
    ) {
      await enqueueEditCleanup(payload, false).catch(() => undefined);
      return {
        id: parsedPreflight.data.memory_id,
        version: encodeMemoryVersion(parsedPreflight.data.updated_at),
        visibility: parsedPreflight.data.visibility,
      };
    }
    if (parsedPreflight.data.status !== "pending") {
      await enqueueEditCleanup(payload, true).catch(() => undefined);
      handleOutcome(parsedPreflight.data.status);
    }

    const finalizedNewAssets = await Promise.all(
      payload.newAssets.map(async (asset): Promise<FinalizedNewAsset> => {
        const downloaded = await admin.storage.from("memory-photos").download(asset.temporaryPath);
        if (downloaded.error || !downloaded.data) {
          throw new Error("Unable to download a memory original.", { cause: downloaded.error });
        }
        const bytes = await downloaded.data.arrayBuffer();
        const photo = await validateMemoryPhotoBytes(asset.name, bytes);
        for (const [path, content, contentType] of [
          [asset.originalPath, bytes, photo.contentType],
          [asset.coverPath, photo.variants.cover, "image/webp"],
          [asset.detailPath, photo.variants.detail, "image/webp"],
        ] as const) {
          await uploadMemoryObjectIfAbsentOrIdentical(admin, path, content, contentType);
        }
        return {
          asset_id: asset.id,
          cover_byte_size: photo.variants.cover.byteLength,
          cover_path: asset.coverPath,
          detail_byte_size: photo.variants.detail.byteLength,
          detail_path: asset.detailPath,
          is_cover: asset.id === payload.coverAssetId,
          is_new: true,
          original_byte_size: bytes.byteLength,
          original_content_type: photo.contentType,
          original_path: asset.originalPath,
          position: payload.finalAssetIds.indexOf(asset.id),
          temporary_path: asset.temporaryPath,
        };
      }),
    );
    const newAssets = new Map(finalizedNewAssets.map((asset) => [asset.asset_id, asset]));
    const response = await admin.rpc("finalize_memory_edit", {
      ...editParameters(payload),
      p_assets: payload.finalAssetIds.map(
        (id, position) =>
          newAssets.get(id) ?? {
            asset_id: id,
            is_cover: id === payload.coverAssetId,
            is_new: false,
            position,
          },
      ),
    });
    const result = editResultSchema.safeParse(response.data);
    if (response.error || !result.success) {
      await enqueueEditCleanup(payload, true).catch(() => undefined);
      throw new Error("Unable to finalize the memory edit.", { cause: response.error });
    }
    if (
      result.data.status !== "completed" ||
      !result.data.memory_id ||
      !result.data.updated_at ||
      !result.data.visibility
    ) {
      await enqueueEditCleanup(payload, true).catch(() => undefined);
      handleOutcome(result.data.status);
    }
    await enqueueEditCleanup(payload, false).catch(() => undefined);
    return {
      id: result.data.memory_id,
      version: encodeMemoryVersion(result.data.updated_at),
      visibility: result.data.visibility,
    };
  } catch (error) {
    if (error instanceof MemoryInputError) throw error;
    throw new EditMemoryError(
      "We could not update this memory. Please try again.",
      {},
      500,
      "pending",
      { cause: error },
    );
  }
}

export { MemoryInputError } from "./memory-input-validation";
export { cleanupResources } from "./resource-cleanup";
