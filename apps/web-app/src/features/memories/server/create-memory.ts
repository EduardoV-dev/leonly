import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemoryInputError, validateCreateMemoryFormData } from "./memory-input-validation";
import { cleanupMemoryCreationAttempt } from "./memory-photo-staging-cleanup";

export { validateCreateMemoryFormData } from "./memory-input-validation";
export { cleanupStaleMemoryPhotoStaging } from "./memory-photo-staging-cleanup";

const uuidSchema = z.uuid();

export const CreateMemoryError = MemoryInputError;

export async function createMemory(userId: string, idempotencyKey: string, formData: FormData) {
  if (!uuidSchema.safeParse(idempotencyKey).success) {
    throw new CreateMemoryError("Please try again with a new form.", {
      form: "Invalid request key.",
    });
  }

  const input = await validateCreateMemoryFormData(formData);
  const admin = createAdminClient();
  const { data: reservationData, error: reservationError } = await admin.rpc(
    "reserve_memory_creation_attempt",
    {
      p_creator_user_id: userId,
      p_idempotency_key: idempotencyKey,
      p_request_fingerprint: input.requestFingerprint,
    },
  );

  if (reservationError || !reservationData?.[0]) {
    throw new CreateMemoryError("This memory is unavailable.", {}, 404);
  }

  const reservation = reservationData[0] as {
    attempt_id: string;
    memory_id: string | null;
    is_new: boolean;
    status: "completed" | "failed" | "processing";
  };

  if (reservation.status === "completed" && reservation.memory_id) {
    return { id: reservation.memory_id, reused: true };
  }

  if (reservation.status !== "processing") {
    throw new CreateMemoryError("We could not save this memory. Please try again.", {}, 409);
  }

  if (!reservation.is_new) {
    throw new CreateMemoryError("This memory is still being saved. Please try again.", {}, 409);
  }

  const photoIds = input.photos.map(() => randomUUID());

  try {
    for (const [position, photo] of input.photos.entries()) {
      const photoId = photoIds[position];
      const { data: stagingData, error: stagingError } = await admin.rpc(
        "stage_memory_photo_variants",
        {
          p_attempt_id: reservation.attempt_id,
          p_photo_id: photoId,
          p_position: position,
        },
      );
      const staging = stagingData?.[0] as
        | {
            cover_object_path?: string;
            detail_object_path?: string;
            object_path?: string;
          }
        | undefined;

      if (
        stagingError ||
        !staging?.object_path ||
        !staging.cover_object_path ||
        !staging.detail_object_path
      ) {
        throw new Error("Unable to stage the memory photo.");
      }

      const uploads = [
        { bytes: photo.bytes, contentType: photo.contentType, path: staging.object_path },
        {
          bytes: photo.variants.cover,
          contentType: "image/webp",
          path: staging.cover_object_path,
        },
        {
          bytes: photo.variants.detail,
          contentType: "image/webp",
          path: staging.detail_object_path,
        },
      ] as const;

      for (const upload of uploads) {
        const { error: uploadError } = await admin.storage
          .from("memory-photos")
          .upload(upload.path, upload.bytes, {
            contentType: upload.contentType,
            upsert: false,
          });
        if (uploadError) {
          throw new Error("Unable to upload the memory photo.");
        }
      }

      const { error: uploadedError } = await admin.rpc("mark_memory_photo_uploaded", {
        p_photo_id: photoId,
      });
      if (uploadedError) {
        throw new Error("Unable to finalize the memory photo.");
      }
    }

    const { data: memoryId, error: finalizeError } = await admin.rpc(
      "finalize_memory_creation_attempt",
      {
        p_attempt_id: reservation.attempt_id,
        p_cover_photo_id: input.coverPhotoIndex === null ? null : photoIds[input.coverPhotoIndex],
        p_description: input.description,
        p_location: input.location,
        p_memory_date: input.memoryDate,
        p_timezone: input.timezone,
        p_title: input.title,
        p_visibility: input.visibility,
      },
    );
    if (finalizeError || typeof memoryId !== "string") {
      throw new Error("Unable to save the memory.");
    }

    return { id: memoryId, reused: false };
  } catch {
    await cleanupMemoryCreationAttempt(reservation.attempt_id);
    throw new CreateMemoryError("We could not save this memory. Please try again.", {}, 500);
  }
}
