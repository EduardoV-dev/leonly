import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { MemoryInputError, validateCreateMemoryFormData } from "./memory-input-validation";
import { cleanupMemoryCreationAttempt } from "./memory-photo-staging-cleanup";
import {
  isStagedMemoryPhotoReady,
  processStagedMemoryPhoto,
  type StagedMemoryPhotoUpload,
} from "./process-staged-memory-photo";

export { validateCreateMemoryFormData } from "./memory-input-validation";
export { cleanupStaleMemoryPhotoStaging } from "./memory-photo-staging-cleanup";

const uuidSchema = z.uuid();

type CreationReservation = {
  attempt_id: string;
  is_new: boolean;
  memory_id: string | null;
  status: "completed" | "failed" | "processing";
};

export const CreateMemoryError = MemoryInputError;

function validateIdempotencyKey(idempotencyKey: string): void {
  if (!uuidSchema.safeParse(idempotencyKey).success) {
    throw new CreateMemoryError(
      "Please try again with a new form.",
      { form: "Invalid request key." },
      400,
      "invalid_request",
    );
  }
}

async function reserveCreation(idempotencyKey: string, requestFingerprint: string) {
  const supabase = await createClient();
  const response = await supabase.rpc("reserve_memory_creation_attempt", {
    p_idempotency_key: idempotencyKey,
    p_request_fingerprint: requestFingerprint,
  });
  const reservation = response.data?.[0] as CreationReservation | undefined;
  if (response.error || !reservation) {
    throw new CreateMemoryError("This memory is unavailable.", {}, 404, "not_found");
  }
  if (reservation.status === "failed") {
    throw new CreateMemoryError(
      "We could not save this memory. Please try again.",
      {},
      409,
      "conflict",
    );
  }
  return { reservation, supabase };
}

async function stageCreationPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  attemptId: string,
  photos: Awaited<ReturnType<typeof validateCreateMemoryFormData>>["photos"],
): Promise<StagedMemoryPhotoUpload[]> {
  const uploads: StagedMemoryPhotoUpload[] = [];
  for (const [position, photo] of photos.entries()) {
    const response = await supabase.rpc("stage_memory_photo_variants", {
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
      throw new Error("Unable to stage the memory photo.", { cause: response.error });
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

export async function prepareMemoryCreation(idempotencyKey: string, formData: FormData) {
  validateIdempotencyKey(idempotencyKey);
  const input = await validateCreateMemoryFormData(formData);
  const { reservation, supabase } = await reserveCreation(idempotencyKey, input.requestFingerprint);
  if (reservation.status === "completed" && reservation.memory_id) {
    return { result: { id: reservation.memory_id, reused: true }, uploads: [] };
  }

  try {
    const uploads = await stageCreationPhotos(supabase, reservation.attempt_id, input.photos);
    return {
      result: null,
      uploads: uploads.map(({ id, originalPath }) => ({ id, path: originalPath })),
    };
  } catch (error) {
    await cleanupMemoryCreationAttempt(reservation.attempt_id).catch(() => undefined);
    throw new CreateMemoryError(
      "We could not prepare these photos. Please try again.",
      {},
      500,
      "memory_upload_prepare_failed",
      { cause: error },
    );
  }
}

export async function createMemory(idempotencyKey: string, formData: FormData) {
  validateIdempotencyKey(idempotencyKey);
  const input = await validateCreateMemoryFormData(formData);
  const { reservation, supabase } = await reserveCreation(idempotencyKey, input.requestFingerprint);
  if (reservation.status === "completed" && reservation.memory_id) {
    return { id: reservation.memory_id, reused: true };
  }

  try {
    const uploads = await stageCreationPhotos(supabase, reservation.attempt_id, input.photos);
    for (const upload of uploads) {
      await processStagedMemoryPhoto(upload, async () => {
        if (
          await isStagedMemoryPhotoReady("memory_photo_staging", reservation.attempt_id, upload.id)
        ) {
          return;
        }
        const marked = await supabase.rpc("mark_memory_photo_uploaded", {
          p_photo_id: upload.id,
        });
        if (marked.error) {
          throw new Error("Unable to finalize the memory photo.", { cause: marked.error });
        }
      });
    }

    const finalized = await supabase.rpc("finalize_memory_creation_attempt", {
      p_attempt_id: reservation.attempt_id,
      p_cover_photo_id: input.coverPhotoId,
      p_description: input.description,
      p_location: input.location,
      p_memory_date: input.memoryDate,
      p_timezone: input.timezone,
      p_title: input.title,
      p_visibility: input.visibility,
    });
    if (finalized.error || typeof finalized.data !== "string") {
      throw new Error("Unable to save the memory.", { cause: finalized.error });
    }
    return { id: finalized.data, reused: false };
  } catch (error) {
    await cleanupMemoryCreationAttempt(reservation.attempt_id).catch(() => undefined);
    throw new CreateMemoryError(
      "We could not save this memory. Please try again.",
      {},
      500,
      "memory_create_failed",
      { cause: error },
    );
  }
}
