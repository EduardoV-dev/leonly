"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import {
  ACCEPTED_MEMORY_PHOTO_EXTENSIONS,
  MAX_MEMORY_PHOTO_COUNT,
  MAX_MEMORY_PHOTO_SIZE_BYTES,
} from "../../constants/create-memory";
import { memoryQueryKeys } from "../../constants/query-keys";

type CreateMemoryValues = {
  description: string;
  location: string;
  memoryDate: string;
  title: string;
  visibility: "timeline" | "vault";
};

type CreateMemoryResponse = {
  error?: string;
  fields?: Record<string, string>;
  id?: string;
};

export type SelectedMemoryPhoto = {
  file: File;
  previewUrl: string;
};

const initialValues: CreateMemoryValues = {
  description: "",
  location: "",
  memoryDate: "",
  title: "",
  visibility: "timeline",
};

function hasAcceptedPhotoExtension(photo: File): boolean {
  const extension = photo.name.split(".").at(-1)?.toLowerCase();

  return Boolean(
    extension &&
      extension !== photo.name.toLowerCase() &&
      ACCEPTED_MEMORY_PHOTO_EXTENSIONS.includes(
        extension as (typeof ACCEPTED_MEMORY_PHOTO_EXTENSIONS)[number],
      ),
  );
}

function createFormData(
  values: CreateMemoryValues,
  photos: SelectedMemoryPhoto[],
  coverPhotoIndex: number | null,
): FormData {
  const formData = new FormData();
  formData.set("title", values.title);
  formData.set("description", values.description);
  formData.set("location", values.location);
  formData.set("memoryDate", values.memoryDate);
  formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  formData.set("visibility", values.visibility);

  if (coverPhotoIndex !== null) {
    formData.set("coverPhotoIndex", String(coverPhotoIndex));
  }

  for (const photo of photos) {
    formData.append("photos", photo.file);
  }

  return formData;
}

export function useCreateMemoryForm() {
  const { t } = useTranslation("memories");
  const router = useRouter();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef<string | null>(null);
  const [coverPhotoIndex, setCoverPhotoIndex] = useState<number | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previewUrls = useRef(new Set<string>());
  const [photos, setPhotos] = useState<SelectedMemoryPhoto[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [values, setValues] = useState<CreateMemoryValues>(initialValues);

  useEffect(
    () => () => {
      for (const previewUrl of previewUrls.current) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [],
  );

  const clearFieldError = (field: string) => {
    setFields((current) => {
      if (!current[field]) {
        return current;
      }

      const nextFields = { ...current };
      delete nextFields[field];
      return nextFields;
    });
  };

  const updateValue = <TKey extends keyof CreateMemoryValues>(
    key: TKey,
    value: CreateMemoryValues[TKey],
  ) => {
    idempotencyKey.current = null;
    clearFieldError(key);
    setSubmitError(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const addPhotos = (nextPhotos: File[]) => {
    if (photos.length + nextPhotos.length > MAX_MEMORY_PHOTO_COUNT) {
      setFields((current) => ({
        ...current,
        photos: t("create.validation.photoCount", { count: MAX_MEMORY_PHOTO_COUNT }),
      }));
      return;
    }

    if (nextPhotos.some((photo) => !hasAcceptedPhotoExtension(photo))) {
      setFields((current) => ({
        ...current,
        photos: t("create.validation.photoType"),
      }));
      return;
    }

    if (nextPhotos.some((photo) => photo.size > MAX_MEMORY_PHOTO_SIZE_BYTES)) {
      setFields((current) => ({
        ...current,
        photos: t("create.validation.photoSize", {
          size: MAX_MEMORY_PHOTO_SIZE_BYTES / 1024 / 1024,
        }),
      }));
      return;
    }

    const additions = nextPhotos.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return { file, previewUrl };
    });

    idempotencyKey.current = null;
    clearFieldError("photos");
    setSubmitError(null);
    setPhotos((current) => [...current, ...additions]);
    setCoverPhotoIndex((current) => current ?? (additions.length > 0 ? 0 : null));
  };

  const removePhoto = (index: number) => {
    const removedPhoto = photos[index];
    if (!removedPhoto) {
      return;
    }

    URL.revokeObjectURL(removedPhoto.previewUrl);
    previewUrls.current.delete(removedPhoto.previewUrl);
    idempotencyKey.current = null;
    clearFieldError("photos");
    setSubmitError(null);
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
    setCoverPhotoIndex((current) => {
      if (photos.length === 1) {
        return null;
      }
      if (current === index) {
        return 0;
      }
      return current !== null && current > index ? current - 1 : current;
    });
  };

  const selectCoverPhoto = (index: number) => {
    idempotencyKey.current = null;
    clearFieldError("photos");
    setCoverPhotoIndex(index);
  };

  const submit = async () => {
    if (isSubmitting) {
      return;
    }

    setFields({});
    setSubmitError(null);
    setIsSubmitting(true);
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/memories", {
        body: createFormData(values, photos, coverPhotoIndex),
        headers: { "Idempotency-Key": idempotencyKey.current },
        method: "POST",
      });
      const payload = (await response.json()) as CreateMemoryResponse;

      if (!response.ok || !payload.id) {
        setFields(payload.fields ?? {});
        throw new Error(payload.error ?? t("create.validation.saveFailed"));
      }

      await queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all });
      router.push(
        values.visibility === "vault"
          ? APP_ROUTES.VAULT_MEMORY_DETAIL(payload.id)
          : APP_ROUTES.TIMELINE,
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("create.validation.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    coverPhotoIndex,
    fields,
    addPhotos,
    isSubmitting,
    photos,
    removePhoto,
    selectCoverPhoto,
    submit,
    submitError,
    updateValue,
    values,
  };
}
