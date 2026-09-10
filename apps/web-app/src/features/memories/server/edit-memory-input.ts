import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { MAX_MEMORY_PHOTO_COUNT } from "../constants/create-memory";
import {
  MemoryInputError,
  type ValidatedMemoryDetails,
  type ValidatedStagedMemoryPhoto,
  validateMemoryDetails,
  validateStagedMemoryPhotos,
} from "./memory-input-validation";
import { decodeMemoryVersion } from "./memory-version";

const uuidSchema = z.uuid();

export type ValidatedEditMemoryInput = ValidatedMemoryDetails & {
  coverPhotoId: string | null;
  expectedUpdatedAt: string;
  photos: ValidatedStagedMemoryPhoto[];
  requestFingerprint: string;
  retainedPhotoIds: string[];
};

function invalidPhotos(message: string): never {
  throw new MemoryInputError("Please review the highlighted fields.", { photos: message });
}

export async function validateEditMemoryFormData(
  formData: FormData,
): Promise<ValidatedEditMemoryInput> {
  const details = validateMemoryDetails(formData);
  const expectedVersion = formData.get("expectedVersion");
  const expectedUpdatedAt =
    typeof expectedVersion === "string" ? decodeMemoryVersion(expectedVersion) : null;
  if (!expectedUpdatedAt) {
    throw new MemoryInputError("Please reload this memory and try again.", {
      form: "Invalid memory version.",
    });
  }

  const retainedEntries = formData.getAll("retainedPhotoIds");
  if (
    retainedEntries.some(
      (entry) => typeof entry !== "string" || !uuidSchema.safeParse(entry).success,
    )
  ) {
    invalidPhotos("One or more retained photos are unavailable.");
  }
  const retainedPhotoIds = [...new Set(retainedEntries as string[])].sort();
  if (retainedPhotoIds.length !== retainedEntries.length) {
    invalidPhotos("A retained photo was included more than once.");
  }

  const newPhotoCount = formData.getAll("photoIds").length;
  if (retainedPhotoIds.length + newPhotoCount > MAX_MEMORY_PHOTO_COUNT) {
    invalidPhotos(`Choose up to ${MAX_MEMORY_PHOTO_COUNT} photos.`);
  }
  const photos = validateStagedMemoryPhotos(formData, MAX_MEMORY_PHOTO_COUNT);

  const coverPhotoIdValue = formData.get("coverPhotoId");
  const coverPhotoId = typeof coverPhotoIdValue === "string" ? coverPhotoIdValue : null;
  const finalPhotoCount = retainedPhotoIds.length + photos.length;
  const hasRetainedCover = coverPhotoId !== null && retainedPhotoIds.includes(coverPhotoId);
  const hasNewCover = coverPhotoId !== null && photos.some((photo) => photo.id === coverPhotoId);

  if (
    (coverPhotoId !== null && !hasRetainedCover && !hasNewCover) ||
    (finalPhotoCount === 0 && coverPhotoId !== null) ||
    (finalPhotoCount > 0 && Number(hasRetainedCover) + Number(hasNewCover) !== 1)
  ) {
    invalidPhotos("Choose one cover photo from the final photo set.");
  }

  const requestFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        ...details,
        coverPhotoId,
        expectedUpdatedAt,
        photos,
        retainedPhotoIds,
      }),
    )
    .digest("hex");

  return {
    ...details,
    coverPhotoId,
    expectedUpdatedAt,
    photos,
    requestFingerprint,
    retainedPhotoIds,
  };
}
