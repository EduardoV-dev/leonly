import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemoryEditResult } from "../types/memory-edit";
import { validateEditMemoryFormData } from "./edit-memory-input";
import { cleanupMemoryEditAttempt } from "./memory-edit-cleanup";
import { MemoryInputError } from "./memory-input-validation";
import { encodeMemoryVersion } from "./memory-version";

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
  ) {
    super(message, fields, status);
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
  if (!row.memory_id || !row.result_updated_at || !row.result_visibility) {
    return null;
  }
  return {
    id: row.memory_id,
    reused,
    version: encodeMemoryVersion(row.result_updated_at),
    visibility: row.result_visibility,
  };
}

export async function editMemory(
  userId: string,
  memoryId: string,
  idempotencyKey: string,
  formData: FormData,
): Promise<MemoryEditResult> {
  if (!uuidSchema.safeParse(memoryId).success) {
    throw new EditMemoryError("This memory is unavailable.", {}, 404, "unavailable");
  }
  if (!uuidSchema.safeParse(idempotencyKey).success) {
    throw new MemoryInputError("Please try again with a new edit request.", {
      form: "Invalid request key.",
    });
  }

  const input = await validateEditMemoryFormData(formData);
  const admin = createAdminClient();
  const reservationResponse = await admin.rpc("reserve_memory_edit_attempt", {
    p_editor_user_id: userId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_idempotency_key: idempotencyKey,
    p_memory_id: memoryId,
    p_request_fingerprint: input.requestFingerprint,
  });
  const reservation = reservationResponse.data?.[0] as Reservation | undefined;
  if (reservationResponse.error || !reservation) {
    throw new Error("Unable to reserve the memory edit.");
  }
  if (reservation.outcome === "completed") {
    const result = completedResult(reservation, true);
    if (result) {
      return result;
    }
    throw new Error("The completed edit outcome is invalid.");
  }
  if (reservation.outcome !== "processing" || !reservation.attempt_id) {
    throwForOutcome(reservation.outcome);
  }
  if (!reservation.is_new) {
    throwForOutcome("pending");
  }

  const photoIds = input.photos.map(() => randomUUID());
  try {
    for (const [position, photo] of input.photos.entries()) {
      const photoId = photoIds[position];
      const stagedResponse = await admin.rpc("stage_memory_edit_photo_variants", {
        p_attempt_id: reservation.attempt_id,
        p_photo_id: photoId,
        p_position: position,
      });
      const staged = stagedResponse.data?.[0] as
        | { cover_object_path?: string; detail_object_path?: string; object_path?: string }
        | undefined;
      if (
        stagedResponse.error ||
        !staged?.object_path ||
        !staged.cover_object_path ||
        !staged.detail_object_path
      ) {
        throw new Error("Unable to stage a replacement photo.");
      }

      const uploads = [
        { bytes: photo.bytes, contentType: photo.contentType, path: staged.object_path },
        { bytes: photo.variants.cover, contentType: "image/webp", path: staged.cover_object_path },
        {
          bytes: photo.variants.detail,
          contentType: "image/webp",
          path: staged.detail_object_path,
        },
      ] as const;
      for (const upload of uploads) {
        const uploaded = await admin.storage
          .from("memory-photos")
          .upload(upload.path, upload.bytes, {
            contentType: upload.contentType,
            upsert: false,
          });
        if (uploaded.error) {
          throw new Error("Unable to upload a replacement photo.");
        }
      }

      const marked = await admin.rpc("mark_memory_edit_photo_uploaded", {
        p_attempt_id: reservation.attempt_id,
        p_photo_id: photoId,
      });
      if (marked.error) {
        throw new Error("Unable to mark a replacement photo ready.");
      }
    }

    const selectedCoverId =
      input.coverNewPhotoIndex === null ? input.coverPhotoId : photoIds[input.coverNewPhotoIndex];
    const finalizedResponse = await admin.rpc("finalize_memory_edit_attempt", {
      p_attempt_id: reservation.attempt_id,
      p_cover_photo_id: selectedCoverId,
      p_description: input.description,
      p_location: input.location,
      p_memory_date: input.memoryDate,
      p_retained_photo_ids: input.retainedPhotoIds,
      p_timezone: input.timezone,
      p_title: input.title,
      p_visibility: input.visibility,
    });
    const finalized = finalizedResponse.data?.[0] as Finalization | undefined;
    if (finalizedResponse.error || !finalized) {
      throw new Error("Unable to finalize the memory edit.");
    }
    if (finalized.outcome !== "completed") {
      throwForOutcome(finalized.outcome);
    }

    const result = completedResult(finalized, false);
    if (!result) {
      throw new Error("The memory edit outcome is invalid.");
    }
    return result;
  } catch (error) {
    await cleanupMemoryEditAttempt(reservation.attempt_id);
    if (error instanceof MemoryInputError) {
      throw error;
    }
    throw new EditMemoryError(
      "We could not update this memory. Please try again.",
      {},
      500,
      "pending",
    );
  }
}

export { cleanupStaleMemoryEdits } from "./memory-edit-cleanup";
export { MemoryInputError } from "./memory-input-validation";
