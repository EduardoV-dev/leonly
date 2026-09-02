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
import type { MemoryEditorPhoto, MemoryEditorValues } from "../../types/memory-editor";

type CreateMemoryResponse = { error?: string; fields?: Record<string, string>; id?: string };

const initialValues: MemoryEditorValues = {
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
  values: MemoryEditorValues,
  photos: MemoryEditorPhoto[],
  coverPhotoKey: string | null,
): FormData {
  const formData = new FormData();
  formData.set("title", values.title);
  formData.set("description", values.description);
  formData.set("location", values.location);
  formData.set("memoryDate", values.memoryDate);
  formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  formData.set("visibility", values.visibility);
  const coverPhotoIndex = photos.findIndex((photo) => photo.key === coverPhotoKey);
  if (coverPhotoIndex >= 0) {
    formData.set("coverPhotoIndex", String(coverPhotoIndex));
  }
  for (const photo of photos) {
    if (photo.kind === "new") {
      formData.append("photos", photo.file);
    }
  }
  return formData;
}

export function useCreateMemoryForm() {
  const { t } = useTranslation("memories");
  const router = useRouter();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef<string | null>(null);
  const nextPhotoKey = useRef(0);
  const previewUrls = useRef(new Set<string>());
  const [coverPhotoKey, setCoverPhotoKey] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<MemoryEditorPhoto[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [values, setValues] = useState<MemoryEditorValues>(initialValues);

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    },
    [],
  );

  const resetAttempt = () => {
    idempotencyKey.current = null;
    setSubmitError(null);
  };
  const clearFieldError = (field: string) =>
    setFields((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  const updateValue = <TKey extends keyof MemoryEditorValues>(
    key: TKey,
    value: MemoryEditorValues[TKey],
  ) => {
    resetAttempt();
    clearFieldError(key);
    setValues((current) => ({ ...current, [key]: value }));
  };
  const addPhotos = (files: File[]) => {
    if (photos.length + files.length > MAX_MEMORY_PHOTO_COUNT) {
      setFields((current) => ({
        ...current,
        photos: t("create.validation.photoCount", { count: MAX_MEMORY_PHOTO_COUNT }),
      }));
      return;
    }
    if (files.some((photo) => !hasAcceptedPhotoExtension(photo))) {
      setFields((current) => ({ ...current, photos: t("create.validation.photoType") }));
      return;
    }
    if (files.some((photo) => photo.size > MAX_MEMORY_PHOTO_SIZE_BYTES)) {
      setFields((current) => ({
        ...current,
        photos: t("create.validation.photoSize", {
          size: MAX_MEMORY_PHOTO_SIZE_BYTES / 1024 / 1024,
        }),
      }));
      return;
    }
    const additions = files.map((file): MemoryEditorPhoto => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      nextPhotoKey.current += 1;
      return { file, key: `new-${nextPhotoKey.current}`, kind: "new", name: file.name, previewUrl };
    });
    resetAttempt();
    clearFieldError("photos");
    setPhotos((current) => [...current, ...additions]);
    setCoverPhotoKey((current) => current ?? additions[0]?.key ?? null);
  };
  const removePhoto = (key: string) => {
    const removed = photos.find((photo) => photo.key === key);
    if (!removed) return;
    if (removed.kind === "new") {
      URL.revokeObjectURL(removed.previewUrl);
      previewUrls.current.delete(removed.previewUrl);
    }
    const remaining = photos.filter((photo) => photo.key !== key);
    resetAttempt();
    clearFieldError("photos");
    setPhotos(remaining);
    setCoverPhotoKey((current) => (current === key ? (remaining[0]?.key ?? null) : current));
  };
  const selectCoverPhoto = (key: string) => {
    resetAttempt();
    clearFieldError("photos");
    setCoverPhotoKey(key);
  };
  const submit = async () => {
    if (isSubmitting) return;
    setFields({});
    setSubmitError(null);
    setIsSubmitting(true);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/memories", {
        body: createFormData(values, photos, coverPhotoKey),
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
    coverPhotoKey,
    fields,
    isSubmitting,
    photos,
    submitError,
    values,
    addPhotos,
    removePhoto,
    selectCoverPhoto,
    submit,
    updateValue,
  };
}
