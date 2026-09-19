import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  MemoryInputError,
  validateCreateMemoryFormData,
  validateMemoryPhotoBytes,
} from "./memory-input-validation";
import {
  type CreateMemoryUploadGrantPayload,
  createMemoryUploadGrant,
  deriveMemoryId,
  type MemoryUploadGrantAsset,
  MemoryUploadGrantError,
  verifyMemoryUploadGrant,
} from "./memory-upload-grant";
import { uploadMemoryObjectIfAbsentOrIdentical } from "./memory-upload-storage";

export { validateCreateMemoryFormData } from "./memory-input-validation";
export { cleanupResources } from "./resource-cleanup";

export const CreateMemoryError = MemoryInputError;

const mutationIdSchema = z.uuid();
const activeSpaceSchema = z.object({ id: z.uuid() });
const creationResultSchema = z
  .object({
    memory_id: z.uuid().nullable(),
    status: z.enum([
      "cleanup_pending",
      "completed",
      "invalid",
      "mismatch",
      "pending",
      "unavailable",
    ]),
    visibility: z.enum(["timeline", "vault"]).nullable(),
  })
  .strict();

type PreparedMemoryCreation = {
  grant: string;
  uploads: Array<{ id: string; path: string; token: string }>;
};

type FinalizedMemoryAsset = {
  asset_id: string;
  cover_byte_size: number;
  cover_path: string;
  detail_byte_size: number;
  detail_path: string;
  is_cover: boolean;
  original_byte_size: number;
  original_content_type: string;
  original_path: string;
  position: number;
};

function unavailable(): never {
  throw new CreateMemoryError("This memory is unavailable.", {}, 404, "not_found");
}

function invalidGrant(error?: unknown): never {
  throw new CreateMemoryError("Please try again with a new form.", {}, 400, "invalid_request", {
    cause: error,
  });
}

export async function prepareMemoryCreation(
  formData: FormData,
  actorId: string,
): Promise<PreparedMemoryCreation> {
  const input = await validateCreateMemoryFormData(formData);
  const mutationId = mutationIdSchema.safeParse(formData.get("mutationId"));
  if (!mutationId.success) invalidGrant();

  const supabase = await createClient();
  const activeSpace = await supabase.rpc("get_active_space");
  const parsedSpace = activeSpaceSchema.safeParse(activeSpace.data);
  if (activeSpace.error)
    throw new Error("Unable to resolve the active space.", { cause: activeSpace.error });
  if (!parsedSpace.success) unavailable();

  const memoryId = deriveMemoryId(actorId, parsedSpace.data.id, mutationId.data);
  const assets: MemoryUploadGrantAsset[] = input.photos.map((photo, position) => {
    const basePath = `${parsedSpace.data.id}/memories/${memoryId}/${photo.id}`;
    return {
      coverPath: `${basePath}/cover.webp`,
      detailPath: `${basePath}/detail.webp`,
      id: photo.id,
      isCover: photo.id === input.coverPhotoId,
      name: photo.name,
      originalPath: `${basePath}/original`,
      position,
      temporaryPath: `${parsedSpace.data.id}/temporary/${mutationId.data}/${photo.id}/original`,
    };
  });
  const grant = createMemoryUploadGrant({
    actorId,
    assets,
    description: input.description,
    location: input.location,
    memoryDate: input.memoryDate,
    memoryId,
    mutationId: mutationId.data,
    operation: "create",
    spaceId: parsedSpace.data.id,
    timezone: input.timezone,
    title: input.title,
    visibility: input.visibility,
  });

  const admin = createAdminClient();
  const uploads = await Promise.all(
    assets.map(async (asset) => {
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

async function enqueueCreationCleanup(
  actorId: string,
  memoryId: string,
  mutationId: string,
  assets: MemoryUploadGrantAsset[],
  includePermanentPaths = true,
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("enqueue_memory_creation_cleanup", {
    p_actor_subject: actorId,
    p_memory_id: memoryId,
    p_mutation_id: mutationId,
    p_paths: assets.flatMap((asset) => [
      asset.temporaryPath,
      ...(includePermanentPaths ? [asset.originalPath, asset.coverPath, asset.detailPath] : []),
    ]),
  });
}

function creationPreflight(payload: CreateMemoryUploadGrantPayload) {
  return {
    p_actor_subject: payload.actorId,
    p_assets: payload.assets.map((asset) => ({
      asset_id: asset.id,
      cover_path: asset.coverPath,
      detail_path: asset.detailPath,
      is_cover: asset.isCover,
      original_path: asset.originalPath,
      position: asset.position,
    })),
    p_description: payload.description,
    p_location: payload.location,
    p_memory_date: payload.memoryDate,
    p_memory_id: payload.memoryId,
    p_mutation_id: payload.mutationId,
    p_space_id: payload.spaceId,
    p_title: payload.title,
    p_visibility: payload.visibility,
  };
}

export async function createMemory(grant: string, actorId: string) {
  let payload: CreateMemoryUploadGrantPayload;
  try {
    payload = verifyMemoryUploadGrant(grant, actorId, "create") as CreateMemoryUploadGrantPayload;
  } catch (error) {
    if (error instanceof MemoryUploadGrantError) invalidGrant(error);
    throw error;
  }

  const admin = createAdminClient();
  const preflight = await admin.rpc("get_memory_creation_result", creationPreflight(payload));
  const parsedPreflight = creationResultSchema.safeParse(preflight.data);
  if (preflight.error || !parsedPreflight.success) {
    await enqueueCreationCleanup(
      actorId,
      payload.memoryId,
      payload.mutationId,
      payload.assets,
    ).catch(() => undefined);
    throw new Error("Unable to check memory creation status.", { cause: preflight.error });
  }
  if (
    parsedPreflight.data.status === "completed" &&
    parsedPreflight.data.memory_id &&
    parsedPreflight.data.visibility
  ) {
    await enqueueCreationCleanup(
      actorId,
      payload.memoryId,
      payload.mutationId,
      payload.assets,
      false,
    ).catch(() => undefined);
    return {
      id: parsedPreflight.data.memory_id,
      visibility: parsedPreflight.data.visibility,
    };
  }
  if (parsedPreflight.data.status !== "pending") {
    await enqueueCreationCleanup(
      actorId,
      payload.memoryId,
      payload.mutationId,
      payload.assets,
    ).catch(() => undefined);
    if (parsedPreflight.data.status === "unavailable") unavailable();
    invalidGrant();
  }

  let assets: FinalizedMemoryAsset[];
  try {
    assets = await Promise.all(
      payload.assets.map(async (asset) => {
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
          is_cover: asset.isCover,
          original_byte_size: bytes.byteLength,
          original_content_type: photo.contentType,
          original_path: asset.originalPath,
          position: asset.position,
        };
      }),
    );
  } catch (error) {
    await enqueueCreationCleanup(
      actorId,
      payload.memoryId,
      payload.mutationId,
      payload.assets,
    ).catch(() => undefined);
    throw error;
  }

  const response = await admin.rpc("finalize_memory_creation", {
    p_actor_subject: actorId,
    p_assets: assets,
    p_description: payload.description,
    p_location: payload.location,
    p_memory_date: payload.memoryDate,
    p_memory_id: payload.memoryId,
    p_mutation_id: payload.mutationId,
    p_space_id: payload.spaceId,
    p_title: payload.title,
    p_visibility: payload.visibility,
  });
  if (response.error) {
    await enqueueCreationCleanup(
      actorId,
      payload.memoryId,
      payload.mutationId,
      payload.assets,
    ).catch(() => undefined);
    throw new Error("Unable to finalize memory creation.", { cause: response.error });
  }
  const result = creationResultSchema.safeParse(response.data);
  if (!result.success) {
    await enqueueCreationCleanup(
      actorId,
      payload.memoryId,
      payload.mutationId,
      payload.assets,
    ).catch(() => undefined);
    throw new Error("The memory creation service returned an invalid response.");
  }
  if (result.data.status !== "completed" || !result.data.memory_id || !result.data.visibility) {
    await enqueueCreationCleanup(
      actorId,
      payload.memoryId,
      payload.mutationId,
      payload.assets,
    ).catch(() => undefined);
    if (result.data.status === "unavailable") unavailable();
    invalidGrant();
  }
  await enqueueCreationCleanup(
    actorId,
    payload.memoryId,
    payload.mutationId,
    payload.assets,
    false,
  ).catch(() => undefined);
  return { id: result.data.memory_id, visibility: result.data.visibility };
}
