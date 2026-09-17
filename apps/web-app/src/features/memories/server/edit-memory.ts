import "server-only";

import { z } from "zod";
import type { MemoryEditResult } from "../types/memory-edit";
import { validateEditMemoryFormData } from "./edit-memory-input";
import {
  finalizeMemoryAttempt,
  MemoryAttemptOutcomeError,
  prepareMemoryAttempt,
} from "./memory-attempt";
import { MemoryInputError } from "./memory-input-validation";
import { encodeMemoryVersion } from "./memory-version";

const uuidSchema = z.uuid();

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

function mapAttemptError(error: unknown): never {
  if (error instanceof MemoryAttemptOutcomeError) {
    if (error.outcome === "unavailable") {
      throw new EditMemoryError("This memory is unavailable.", {}, 404, "unavailable");
    }
    if (error.outcome === "conflict") {
      throw new EditMemoryError(
        "This memory changed. Reload the current version before saving.",
        {},
        409,
        "conflict",
      );
    }
    if (error.outcome === "invalid") {
      throw new MemoryInputError("Please review the highlighted fields.", {
        photos: "One or more selected photos are unavailable.",
      });
    }
  }
  throw error;
}

export async function prepareMemoryEdit(memoryId: string, formData: FormData) {
  if (!uuidSchema.safeParse(memoryId).success) {
    throw new EditMemoryError("This memory is unavailable.", {}, 404, "unavailable");
  }
  const input = await validateEditMemoryFormData(formData);
  const newIds = new Set(input.photos.map((photo) => photo.id));
  try {
    return await prepareMemoryAttempt({
      ...input,
      assets: input.assetIds.map((id) => ({
        id,
        isCover: id === input.coverPhotoId,
        isNew: newIds.has(id),
      })),
      attemptType: "edit",
      expectedUpdatedAt: input.expectedUpdatedAt,
      memoryId,
    });
  } catch (error) {
    mapAttemptError(error);
  }
}

export async function editMemory(attemptId: string): Promise<MemoryEditResult> {
  try {
    const result = await finalizeMemoryAttempt(attemptId);
    return {
      id: result.id,
      version: encodeMemoryVersion(result.updatedAt),
      visibility: result.visibility,
    };
  } catch (error) {
    if (error instanceof MemoryAttemptOutcomeError) mapAttemptError(error);
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
