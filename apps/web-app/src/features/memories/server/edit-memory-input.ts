import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import {
  MemoryInputError,
  type ValidatedMemoryDetails,
  type ValidatedMemoryPhoto,
  validateMemoryDetails,
  validateMemoryPhotos,
} from "./memory-input-validation";
import { decodeMemoryVersion } from "./memory-version";

const MAX_EDIT_PHOTO_COUNT = 5;
const uuidSchema = z.uuid();

export type ValidatedEditMemoryInput = ValidatedMemoryDetails & {
  coverNewPhotoIndex: number | null;
  coverPhotoId: string | null;
  expectedUpdatedAt: string;
  photos: ValidatedMemoryPhoto[];
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

  const newPhotoCount = formData.getAll("photos").length;
  if (retainedPhotoIds.length + newPhotoCount > MAX_EDIT_PHOTO_COUNT) {
    invalidPhotos(`Choose up to ${MAX_EDIT_PHOTO_COUNT} photos.`);
  }
  const photos = await validateMemoryPhotos(formData, MAX_EDIT_PHOTO_COUNT);

  const coverPhotoIdValue = formData.get("coverPhotoId");
  const coverPhotoId = typeof coverPhotoIdValue === "string" ? coverPhotoIdValue : null;
  const coverNewPhotoIndexValue = formData.get("coverPhotoIndex");
  const coverNewPhotoIndex =
    typeof coverNewPhotoIndexValue === "string" ? Number(coverNewPhotoIndexValue) : null;
  const finalPhotoCount = retainedPhotoIds.length + photos.length;
  const hasRetainedCover = coverPhotoId !== null && retainedPhotoIds.includes(coverPhotoId);
  const hasNewCover =
    coverNewPhotoIndex !== null &&
    Number.isInteger(coverNewPhotoIndex) &&
    coverNewPhotoIndex >= 0 &&
    coverNewPhotoIndex < photos.length;

  if (
    (coverPhotoId !== null && !hasRetainedCover) ||
    (coverNewPhotoIndexValue !== null && !hasNewCover) ||
    (finalPhotoCount === 0 && (coverPhotoId !== null || coverNewPhotoIndexValue !== null)) ||
    (finalPhotoCount > 0 && Number(hasRetainedCover) + Number(hasNewCover) !== 1)
  ) {
    invalidPhotos("Choose one cover photo from the final photo set.");
  }

  const requestFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        ...details,
        coverNewPhotoIndex,
        coverPhotoId,
        expectedUpdatedAt,
        photos: photos.map((photo) => photo.digest),
        retainedPhotoIds,
      }),
    )
    .digest("hex");

  return {
    ...details,
    coverNewPhotoIndex,
    coverPhotoId,
    expectedUpdatedAt,
    photos,
    requestFingerprint,
    retainedPhotoIds,
  };
}
