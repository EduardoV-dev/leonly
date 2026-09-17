import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateMemoryPhotoBytes } from "./memory-input-validation";

type AssetObject = {
  byte_size: number | null;
  content_type: string | null;
  id: string;
  object_path: string;
  status: "failed" | "pending" | "processing" | "ready" | "uploaded";
  variant_type: "cover" | "detail" | "original";
};

type AttemptAsset = {
  id: string;
  memory_asset_objects: AssetObject[];
};

async function markObject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name:
    | "mark_memory_asset_object_failed"
    | "mark_memory_asset_object_processing"
    | "mark_memory_asset_object_ready",
  object: AssetObject,
  metadata?: { byteSize: number; contentType: string },
): Promise<void> {
  const parameters =
    name === "mark_memory_asset_object_ready"
      ? {
          p_byte_size: metadata?.byteSize,
          p_content_type: metadata?.contentType,
          p_object_id: object.id,
        }
      : name === "mark_memory_asset_object_failed"
        ? { p_failure_code: "asset_processing_failed", p_object_id: object.id }
        : { p_object_id: object.id };
  const response = await supabase.rpc(name, parameters);
  const expectedStatus = name.replace("mark_memory_asset_object_", "");
  if (response.error || (response.data as { status?: string } | null)?.status !== expectedStatus) {
    throw new Error("Unable to record memory asset object state.", { cause: response.error });
  }
}

function requiredObject(asset: AttemptAsset, variant: AssetObject["variant_type"]): AssetObject {
  const object = asset.memory_asset_objects.find((candidate) => candidate.variant_type === variant);
  if (!object) throw new Error(`The memory asset is missing its ${variant} object.`);
  return object;
}

export async function processMemoryAttemptAssets(attemptId: string): Promise<void> {
  const admin = createAdminClient();
  const response = await admin
    .from("memory_assets")
    .select("id,memory_asset_objects(id,variant_type,object_path,status,content_type,byte_size)")
    .eq("staging_attempt_id", attemptId);
  if (response.error || !response.data) {
    throw new Error("Unable to inspect memory attempt assets.", { cause: response.error });
  }

  const supabase = await createClient();
  for (const asset of response.data as AttemptAsset[]) {
    const original = requiredObject(asset, "original");
    const cover = requiredObject(asset, "cover");
    const detail = requiredObject(asset, "detail");
    if ([original, cover, detail].every((object) => object.status === "ready")) continue;

    let currentObject = [original, cover, detail].find((object) => object.status !== "ready");
    if (!currentObject) continue;
    try {
      await markObject(supabase, "mark_memory_asset_object_processing", currentObject);
      const downloaded = await admin.storage.from("memory-photos").download(original.object_path);
      if (downloaded.error || !downloaded.data) {
        throw new Error("Unable to download the memory asset original.", {
          cause: downloaded.error,
        });
      }
      const bytes = await downloaded.data.arrayBuffer();
      const photo = await validateMemoryPhotoBytes(null, bytes);
      if (original.status !== "ready") {
        await markObject(supabase, "mark_memory_asset_object_ready", original, {
          byteSize: bytes.byteLength,
          contentType: photo.contentType,
        });
      }

      for (const [object, variantBytes] of [
        [cover, photo.variants.cover],
        [detail, photo.variants.detail],
      ] as const) {
        if (object.status === "ready") continue;
        if (object !== currentObject) {
          currentObject = object;
          await markObject(supabase, "mark_memory_asset_object_processing", object);
        }
        const stored = await admin.storage
          .from("memory-photos")
          .upload(object.object_path, variantBytes, {
            contentType: "image/webp",
            upsert: true,
          });
        if (stored.error) {
          throw new Error("Unable to store a memory asset variant.", { cause: stored.error });
        }
        await markObject(supabase, "mark_memory_asset_object_ready", object, {
          byteSize: variantBytes.byteLength,
          contentType: "image/webp",
        });
      }
    } catch (error) {
      await markObject(supabase, "mark_memory_asset_object_failed", currentObject).catch(
        () => undefined,
      );
      throw error;
    }
  }
}
