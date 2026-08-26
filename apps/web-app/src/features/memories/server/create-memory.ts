import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_MEMORY_PHOTO_COUNT, MAX_MEMORY_PHOTO_SIZE_BYTES } from "../constants/create-memory";
import {
  createMemoryPhotoVariants,
  type MemoryPhotoVariants,
} from "./create-memory-photo-variants";
import { cleanupMemoryCreationAttempt } from "./memory-photo-staging-cleanup";

export { cleanupStaleMemoryPhotoStaging } from "./memory-photo-staging-cleanup";

const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_LOCATION_LENGTH = 150;
const MAX_TITLE_LENGTH = 120;

const memoryDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidSchema = z.uuid();

type ValidatedPhoto = {
  bytes: ArrayBuffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  digest: string;
  variants: MemoryPhotoVariants;
};

type ValidatedMemoryInput = {
  coverPhotoIndex: number | null;
  description: string | null;
  location: string | null;
  memoryDate: string;
  photos: ValidatedPhoto[];
  requestFingerprint: string;
  timezone: string;
  title: string;
  visibility: "timeline" | "vault";
};

export class CreateMemoryError extends Error {
  constructor(
    message: string,
    readonly fields: Record<string, string> = {},
    readonly status = 400,
  ) {
    super(message);
  }
}

function asTrimmedText(value: FormDataEntryValue | null, field: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new CreateMemoryError("Please review the highlighted fields.", { [field]: "Required." });
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0 && field === "title") {
    throw new CreateMemoryError("Please review the highlighted fields.", { title: "Required." });
  }

  if (trimmedValue.length > maxLength) {
    throw new CreateMemoryError("Please review the highlighted fields.", {
      [field]: `Must be ${maxLength} characters or fewer.`,
    });
  }

  return trimmedValue || null;
}

function getCurrentDateInTimezone(timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).formatToParts();
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    throw new CreateMemoryError("Please review the highlighted fields.", {
      timezone: "Choose a valid timezone.",
    });
  }
}

function isRealCalendarDate(value: string) {
  if (!memoryDatePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function detectImageContent(bytes: Uint8Array): ValidatedPhoto["contentType"] | null {
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if (isJpeg) {
    return "image/jpeg";
  }

  if (isPng) {
    return "image/png";
  }

  return isWebp ? "image/webp" : null;
}

async function validatePhoto(file: File): Promise<ValidatedPhoto> {
  if (file.size > MAX_MEMORY_PHOTO_SIZE_BYTES) {
    throw new CreateMemoryError("Please review the highlighted fields.", {
      photos: "Each photo must be 5 MB or smaller.",
    });
  }

  const bytes = await file.arrayBuffer();
  const contentType = detectImageContent(new Uint8Array(bytes));
  if (!contentType) {
    throw new CreateMemoryError("Please review the highlighted fields.", {
      photos: "Photos must be JPEG, PNG, or WebP images.",
    });
  }

  try {
    return {
      bytes,
      contentType,
      digest: createHash("sha256").update(Buffer.from(bytes)).digest("hex"),
      variants: await createMemoryPhotoVariants(bytes),
    };
  } catch {
    throw new CreateMemoryError("Please review the highlighted fields.", {
      photos: "One or more photos could not be processed.",
    });
  }
}

export async function validateCreateMemoryFormData(
  formData: FormData,
): Promise<ValidatedMemoryInput> {
  const title = asTrimmedText(formData.get("title"), "title", MAX_TITLE_LENGTH);
  const description = asTrimmedText(
    formData.get("description"),
    "description",
    MAX_DESCRIPTION_LENGTH,
  );
  const location = asTrimmedText(formData.get("location"), "location", MAX_LOCATION_LENGTH);
  const memoryDate = formData.get("memoryDate");
  const timezone = formData.get("timezone");
  const visibility = formData.get("visibility");

  if (typeof memoryDate !== "string" || !isRealCalendarDate(memoryDate)) {
    throw new CreateMemoryError("Please review the highlighted fields.", {
      memoryDate: "Choose a valid date.",
    });
  }

  if (typeof timezone !== "string" || !timezone) {
    throw new CreateMemoryError("Please review the highlighted fields.", {
      timezone: "Choose a valid timezone.",
    });
  }

  if (memoryDate > getCurrentDateInTimezone(timezone)) {
    throw new CreateMemoryError("Please review the highlighted fields.", {
      memoryDate: "A memory date cannot be in the future.",
    });
  }

  if (visibility !== "timeline" && visibility !== "vault") {
    throw new CreateMemoryError("Please review the highlighted fields.", {
      visibility: "Choose where this memory belongs.",
    });
  }

  const files = formData.getAll("photos");
  if (files.some((value) => !(value instanceof File)) || files.length > MAX_MEMORY_PHOTO_COUNT) {
    throw new CreateMemoryError("Please review the highlighted fields.", {
      photos: "Choose up to 10 photos.",
    });
  }

  const photos: ValidatedPhoto[] = [];
  for (const file of files) {
    photos.push(await validatePhoto(file as File));
  }
  const coverPhotoIndexValue = formData.get("coverPhotoIndex");
  const coverPhotoIndex = photos.length === 0 ? null : Number(coverPhotoIndexValue);
  const hasInvalidCover =
    photos.length > 0 &&
    (coverPhotoIndex === null ||
      !Number.isInteger(coverPhotoIndex) ||
      coverPhotoIndex < 0 ||
      coverPhotoIndex >= photos.length);

  if (hasInvalidCover || (photos.length === 0 && coverPhotoIndexValue !== null)) {
    throw new CreateMemoryError("Please review the highlighted fields.", {
      photos: "Choose one cover photo.",
    });
  }

  const requestFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        coverPhotoIndex,
        description,
        location,
        memoryDate,
        photos: photos.map((photo) => photo.digest),
        timezone,
        title,
        visibility,
      }),
    )
    .digest("hex");

  return {
    coverPhotoIndex,
    description,
    location,
    memoryDate,
    photos,
    requestFingerprint,
    timezone,
    title: title ?? "",
    visibility,
  };
}

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
