import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MemoryEditResult } from "../types/memory-edit";
import { validateEditMemoryFormData } from "./edit-memory-input";
import { cleanupMemoryEditAttempt } from "./memory-edit-cleanup";
import { MemoryInputError } from "./memory-input-validation";
import { encodeMemoryVersion } from "./memory-version";
import {
  isStagedMemoryPhotoReady,
  processStagedMemoryPhoto,
  type StagedMemoryPhotoUpload,
} from "./process-staged-memory-photo";

const uuidSchema = z.uuid();

type EditOutcome =
  | "completed"
  | "conflict"
  | "failed"
  | "invalid"
  | "mismatch"
  | "pending"
  | "processing"
  | "unavailable";

type Reservation = {
  attempt_id: string | null;
  is_new: boolean;
  memory_id: string | null;
  outcome: EditOutcome;
  result_updated_at: string | null;
  result_visibility: "timeline" | "vault" | null;
};

type Finalization = {
  memory_id: string | null;
  outcome: "completed" | "conflict" | "invalid" | "unavailable";
  result_updated_at: string | null;
  result_visibility: "timeline" | "vault" | null;
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

function throwForOutcome(outcome: EditOutcome): never {
  if (outcome === "unavailable") {
    throw new EditMemoryError("This memory is unavailable.", {}, 404, "unavailable");
  }
  if (outcome === "conflict") {
    throw new EditMemoryError(
      "This memory changed. Reload the current version before saving.",
      {},
      409,
      "conflict",
    );
  }
  if (outcome === "mismatch") {
    throw new MemoryInputError("Please try again with a new edit request.", {
      form: "The request key was already used for different changes.",
    });
  }
  if (outcome === "invalid") {
    throw new MemoryInputError("Please review the highlighted fields.", {
      photos: "One or more retained photos are unavailable.",
    });
  }
  throw new EditMemoryError(
    "This edit is still being saved. Please try again.",
    {},
    409,
    "pending",
  );
}

function completedResult(
  row: Pick<Reservation, "memory_id" | "result_updated_at" | "result_visibility">,
  reused: boolean,
): MemoryEditResult | null {
  if (!row.memory_id || !row.result_updated_at || !row.result_visibility) return null;
  return {
    id: row.memory_id,
    reused,
    version: encodeMemoryVersion(row.result_updated_at),
    visibility: row.result_visibility,
  };
}

function validateRequest(memoryId: string, idempotencyKey: string): void {
  if (!uuidSchema.safeParse(memoryId).success) {
    throw new EditMemoryError("This memory is unavailable.", {}, 404, "unavailable");
  }
  if (!uuidSchema.safeParse(idempotencyKey).success) {
    throw new MemoryInputError("Please try again with a new edit request.", {
      form: "Invalid request key.",
    });
  }
}

async function reserveEdit(
  memoryId: string,
  idempotencyKey: string,
  input: Awaited<ReturnType<typeof validateEditMemoryFormData>>,
) {
  const supabase = await createClient();
  const response = await supabase.rpc("reserve_memory_edit_attempt", {
    p_expected_updated_at: input.expectedUpdatedAt,
    p_idempotency_key: idempotencyKey,
    p_memory_id: memoryId,
    p_request_fingerprint: input.requestFingerprint,
  });
  const reservation = response.data?.[0] as Reservation | undefined;
  if (response.error || !reservation) {
    throw new Error("Unable to reserve the memory edit.", { cause: response.error });
  }
  if (reservation.outcome !== "processing" && reservation.outcome !== "completed") {
    throwForOutcome(reservation.outcome);
  }
  return { reservation, supabase };
}

async function stageEditPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  attemptId: string,
  photos: Awaited<ReturnType<typeof validateEditMemoryFormData>>["photos"],
): Promise<StagedMemoryPhotoUpload[]> {
  if (photos.length === 0) return [];

  const admin = createAdminClient();
  const existingResponse = await admin
    .from("memory_edit_photo_staging")
    .select("id,object_path,cover_object_path,detail_object_path,position")
    .eq("attempt_id", attemptId)
    .order("position", { ascending: true });
  if (existingResponse.error) {
    throw new Error("Unable to inspect staged replacement photos.", {
      cause: existingResponse.error,
    });
  }
  const existingById = new Map((existingResponse.data ?? []).map((row) => [row.id, row]));
  const uploads: StagedMemoryPhotoUpload[] = [];
  for (const [position, photo] of photos.entries()) {
    const existing = existingById.get(photo.id);
    if (existing) {
      if (existing.position !== position) {
        throw new Error("A staged replacement photo has an invalid position.");
      }
      uploads.push({
        ...photo,
        coverPath: existing.cover_object_path,
        detailPath: existing.detail_object_path,
        originalPath: existing.object_path,
      });
      continue;
    }
    const response = await supabase.rpc("stage_memory_edit_photo_variants", {
      p_attempt_id: attemptId,
      p_photo_id: photo.id,
      p_position: position,
    });
    const staged = response.data?.[0] as
      | { cover_object_path?: string; detail_object_path?: string; object_path?: string }
      | undefined;
    if (
      response.error ||
      !staged?.object_path ||
      !staged.cover_object_path ||
      !staged.detail_object_path
    ) {
      throw new Error("Unable to stage a replacement photo.", { cause: response.error });
    }
    uploads.push({
      ...photo,
      coverPath: staged.cover_object_path,
      detailPath: staged.detail_object_path,
      originalPath: staged.object_path,
    });
  }
  return uploads;
}

export async function prepareMemoryEdit(
  memoryId: string,
  idempotencyKey: string,
  formData: FormData,
) {
  validateRequest(memoryId, idempotencyKey);
  const input = await validateEditMemoryFormData(formData);
  const { reservation, supabase } = await reserveEdit(memoryId, idempotencyKey, input);
  if (reservation.outcome === "completed") {
    const result = completedResult(reservation, true);
    if (!result) throw new Error("The completed edit outcome is invalid.");
    return { result, uploads: [] };
  }
  if (!reservation.attempt_id) throwForOutcome("pending");

  try {
    const uploads = await stageEditPhotos(supabase, reservation.attempt_id, input.photos);
    return {
      result: null,
      uploads: uploads.map(({ id, originalPath }) => ({ id, path: originalPath })),
    };
  } catch (error) {
    await cleanupMemoryEditAttempt(reservation.attempt_id);
    throw new EditMemoryError(
      "We could not prepare these photos. Please try again.",
      {},
      500,
      "pending",
      { cause: error },
    );
  }
}

export async function editMemory(
  memoryId: string,
  idempotencyKey: string,
  formData: FormData,
): Promise<MemoryEditResult> {
  validateRequest(memoryId, idempotencyKey);
  const input = await validateEditMemoryFormData(formData);
  const { reservation, supabase } = await reserveEdit(memoryId, idempotencyKey, input);
  if (reservation.outcome === "completed") {
    const result = completedResult(reservation, true);
    if (result) return result;
    throw new Error("The completed edit outcome is invalid.");
  }
  if (!reservation.attempt_id) throwForOutcome("pending");
  const attemptId = reservation.attempt_id;

  let failedOperation = "finalization";
  try {
    const uploads = await stageEditPhotos(supabase, attemptId, input.photos);
    for (const upload of uploads) {
      failedOperation = "photo processing";
      await processStagedMemoryPhoto(upload, async () => {
        if (await isStagedMemoryPhotoReady("memory_edit_photo_staging", attemptId, upload.id)) {
          return;
        }
        const marked = await supabase.rpc("mark_memory_edit_photo_uploaded", {
          p_attempt_id: attemptId,
          p_photo_id: upload.id,
        });
        if (marked.error) {
          throw new Error("Unable to mark a replacement photo ready.", { cause: marked.error });
        }
      });
    }

    failedOperation = "finalization";
    const response = await supabase.rpc("finalize_memory_edit_attempt", {
      p_attempt_id: attemptId,
      p_cover_photo_id: input.coverPhotoId,
      p_description: input.description,
      p_location: input.location,
      p_memory_date: input.memoryDate,
      p_retained_photo_ids: input.retainedPhotoIds,
      p_timezone: input.timezone,
      p_title: input.title,
      p_visibility: input.visibility,
    });
    const finalized = response.data?.[0] as Finalization | undefined;
    if (response.error || !finalized) {
      throw new Error("Unable to finalize the memory edit.", { cause: response.error });
    }
    if (finalized.outcome !== "completed") throwForOutcome(finalized.outcome);

    const result = completedResult(finalized, false);
    if (!result) throw new Error("The memory edit outcome is invalid.");
    return result;
  } catch (error) {
    await cleanupMemoryEditAttempt(attemptId);
    if (error instanceof MemoryInputError) throw error;
    throw new EditMemoryError(
      "We could not update this memory. Please try again.",
      {},
      500,
      "pending",
      { cause: new Error(`Memory edit ${failedOperation} failed.`, { cause: error }) },
    );
  }
}

export { cleanupStaleMemoryEdits } from "./memory-edit-cleanup";
export { MemoryInputError } from "./memory-input-validation";
