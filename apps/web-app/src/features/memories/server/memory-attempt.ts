import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ValidatedMemoryDetails, ValidatedStagedMemoryPhoto } from "./memory-input-validation";
import { processMemoryAttemptAssets } from "./process-memory-attempt-assets";

const uuidSchema = z.uuid();

type AttemptAssetInput = {
  id: string;
  isCover: boolean;
  isNew: boolean;
};

type PrepareMemoryAttemptInput = ValidatedMemoryDetails & {
  assets: AttemptAssetInput[];
  attemptType: "create" | "edit";
  expectedUpdatedAt: string | null;
  memoryId: string | null;
};

type PreparedAttempt = {
  attemptId: string;
  uploads: Array<{ id: string; path: string }>;
};

type FinalizedAttempt = {
  id: string;
  updatedAt: string;
  visibility: "timeline" | "vault";
};

export class MemoryAttemptOutcomeError extends Error {
  constructor(readonly outcome: string) {
    super(`Memory attempt outcome: ${outcome}`);
  }
}

export function newAssets(
  photos: ValidatedStagedMemoryPhoto[],
  coverPhotoId: string | null,
): AttemptAssetInput[] {
  return photos.map((photo) => ({
    id: photo.id,
    isCover: photo.id === coverPhotoId,
    isNew: true,
  }));
}

export async function prepareMemoryAttempt(
  input: PrepareMemoryAttemptInput,
): Promise<PreparedAttempt> {
  const supabase = await createClient();
  const response = await supabase.rpc("prepare_memory_attempt", {
    p_assets: input.assets.map((asset, position) => ({
      asset_id: asset.id,
      is_cover: asset.isCover,
      is_new: asset.isNew,
      position,
    })),
    p_attempt_type: input.attemptType,
    p_description: input.description,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_location: input.location,
    p_memory_date: input.memoryDate,
    p_memory_id: input.memoryId,
    p_timezone: input.timezone,
    p_title: input.title,
    p_visibility: input.visibility,
  });
  const result = response.data as {
    attempt_id?: string;
    status?: string;
    uploads?: Array<{ asset_id?: string; object_path?: string }>;
  } | null;
  if (response.error || !result) {
    throw new Error("Unable to prepare the memory attempt.", { cause: response.error });
  }
  if (
    result.status !== "prepared" ||
    !result.attempt_id ||
    !uuidSchema.safeParse(result.attempt_id).success
  ) {
    throw new MemoryAttemptOutcomeError(result.status ?? "invalid");
  }
  const uploads = (result.uploads ?? []).map((upload) => {
    if (!upload.asset_id || !uuidSchema.safeParse(upload.asset_id).success || !upload.object_path) {
      throw new Error("The prepared memory uploads are invalid.");
    }
    return { id: upload.asset_id, path: upload.object_path };
  });
  return {
    attemptId: result.attempt_id,
    uploads,
  };
}

export async function finalizeMemoryAttempt(attemptId: string): Promise<FinalizedAttempt> {
  if (!uuidSchema.safeParse(attemptId).success) throw new MemoryAttemptOutcomeError("invalid");
  await processMemoryAttemptAssets(attemptId);
  const supabase = await createClient();
  const response = await supabase.rpc("finalize_memory_attempt", { p_attempt_id: attemptId });
  const result = response.data as {
    memory_id?: string;
    status?: string;
    updated_at?: string;
    visibility?: "timeline" | "vault";
  } | null;
  if (response.error || !result) {
    throw new Error("Unable to finalize the memory attempt.", { cause: response.error });
  }
  if (result.status !== "completed") {
    throw new MemoryAttemptOutcomeError(result.status ?? "invalid");
  }
  if (!result.memory_id || !result.updated_at || !result.visibility) {
    throw new Error("The finalized memory attempt is invalid.");
  }
  return {
    id: result.memory_id,
    updatedAt: result.updated_at,
    visibility: result.visibility,
  };
}
