import "server-only";

import {
  finalizeMemoryAttempt,
  MemoryAttemptOutcomeError,
  newAssets,
  prepareMemoryAttempt,
} from "./memory-attempt";
import { MemoryInputError, validateCreateMemoryFormData } from "./memory-input-validation";

export { validateCreateMemoryFormData } from "./memory-input-validation";
export { cleanupResources } from "./resource-cleanup";

export const CreateMemoryError = MemoryInputError;

function mapAttemptError(error: unknown): never {
  if (error instanceof MemoryAttemptOutcomeError) {
    if (error.outcome === "unavailable") {
      throw new CreateMemoryError("This memory is unavailable.", {}, 404, "not_found");
    }
    if (error.outcome === "invalid") {
      throw new CreateMemoryError("Please review the highlighted fields.", {}, 400);
    }
  }
  throw error;
}

export async function prepareMemoryCreation(formData: FormData) {
  const input = await validateCreateMemoryFormData(formData);
  try {
    return await prepareMemoryAttempt({
      ...input,
      assets: newAssets(input.photos, input.coverPhotoId),
      attemptType: "create",
      expectedUpdatedAt: null,
      memoryId: null,
    });
  } catch (error) {
    mapAttemptError(error);
  }
}

export async function createMemory(attemptId: string) {
  try {
    const result = await finalizeMemoryAttempt(attemptId);
    return { id: result.id, visibility: result.visibility };
  } catch (error) {
    mapAttemptError(error);
  }
}
