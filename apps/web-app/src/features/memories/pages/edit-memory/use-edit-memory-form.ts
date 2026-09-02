"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { toast } from "@/utils/toast";
import {
  ACCEPTED_MEMORY_PHOTO_EXTENSIONS,
  MAX_MEMORY_PHOTO_SIZE_BYTES,
} from "../../constants/create-memory";
import { MAX_EDIT_MEMORY_PHOTO_COUNT } from "../../constants/edit-memory";
import { memoryQueryKeys } from "../../constants/query-keys";
import type { MemoryEdit } from "../../types/memory-edit";
import type { MemoryEditorPhoto, MemoryEditorValues } from "../../types/memory-editor";

type EditResponse = {
  code?: "conflict" | "pending" | "unavailable";
  error?: string;
  fields?: Record<string, string>;
  id?: string;
  visibility?: "timeline" | "vault";
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

function detailRoute(memoryId: string, visibility: "timeline" | "vault"): string {
  return visibility === "vault"
    ? APP_ROUTES.VAULT_MEMORY_DETAIL(memoryId)
    : APP_ROUTES.MEMORY_DETAIL(memoryId);
}

function createEditFormData(
  memory: MemoryEdit,
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
  formData.set("expectedVersion", memory.version);
  const retained = photos.filter((photo) => photo.kind === "retained");
  for (const photo of retained) formData.append("retainedPhotoIds", photo.id);
  const newPhotos = photos.filter((photo) => photo.kind === "new");
  for (const photo of newPhotos) formData.append("photos", photo.file);
  const cover = photos.find((photo) => photo.key === coverPhotoKey);
  if (cover?.kind === "retained") formData.set("coverPhotoId", cover.id);
  if (cover?.kind === "new") formData.set("coverPhotoIndex", String(newPhotos.indexOf(cover)));
  return formData;
}

function toDraft(memory: MemoryEdit) {
  const photos: MemoryEditorPhoto[] = memory.photos.map((photo, index) => ({
    id: photo.id,
    key: `retained-${photo.id}`,
    kind: "retained",
    name: `photo ${index + 1}`,
    previewUrl: photo.previewUrl,
  }));
  return {
    coverPhotoKey: memory.coverPhotoId ? `retained-${memory.coverPhotoId}` : null,
    photos,
    values: {
      description: memory.description ?? "",
      location: memory.location ?? "",
      memoryDate: memory.memoryDate,
      title: memory.title,
      visibility: memory.initialVisibility,
    } satisfies MemoryEditorValues,
  };
}

export function useEditMemoryForm(memory: MemoryEdit) {
  const { t } = useTranslation("memories");
  const router = useRouter();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef<string | null>(null);
  const nextPhotoKey = useRef(0);
  const previewUrls = useRef(new Set<string>());
  const initialDraft = toDraft(memory);
  const [values, setValues] = useState<MemoryEditorValues>(initialDraft.values);
  const [photos, setPhotos] = useState<MemoryEditorPhoto[]>(initialDraft.photos);
  const [coverPhotoKey, setCoverPhotoKey] = useState<string | null>(initialDraft.coverPhotoKey);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [isConflict, setIsConflict] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const draft = toDraft(memory);
    previewUrls.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    previewUrls.current.clear();
    setValues(draft.values);
    setPhotos(draft.photos);
    setCoverPhotoKey(draft.coverPhotoKey);
    setFields({});
    setIsConflict(false);
    setIsDirty(false);
    setSubmitError(null);
    idempotencyKey.current = null;
  }, [memory]);
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    },
    [],
  );

  const clearFieldError = (field: string) =>
    setFields((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  const changeDraft = (field: string) => {
    idempotencyKey.current = null;
    clearFieldError(field);
    setIsDirty(true);
    setSubmitError(null);
  };
  const updateValue = <TKey extends keyof MemoryEditorValues>(
    key: TKey,
    value: MemoryEditorValues[TKey],
  ) => {
    changeDraft(key);
    setValues((current) => ({ ...current, [key]: value }));
  };
  const addPhotos = (files: File[]) => {
    if (photos.length + files.length > MAX_EDIT_MEMORY_PHOTO_COUNT) {
      setFields((current) => ({
        ...current,
        photos: t("edit.validation.photoCount", { count: MAX_EDIT_MEMORY_PHOTO_COUNT }),
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
      return {
        file,
        key: `new-${nextPhotoKey.current}`,
        kind: "new",
        name: file.name,
        previewUrl,
      };
    });
    changeDraft("photos");
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
    changeDraft("photos");
    setPhotos(remaining);
    setCoverPhotoKey((current) => (current === key ? (remaining[0]?.key ?? null) : current));
  };
  const selectCoverPhoto = (key: string) => {
    changeDraft("photos");
    setCoverPhotoKey(key);
  };
  const reload = () => router.refresh();
  const submit = async () => {
    if (isSubmitting) return;
    setFields({});
    setSubmitError(null);
    setIsSubmitting(true);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch(`/api/memories/${memory.id}/edit`, {
        body: createEditFormData(memory, values, photos, coverPhotoKey),
        headers: { "Idempotency-Key": idempotencyKey.current },
        method: "PATCH",
      });
      const payload = (await response.json()) as EditResponse;
      if (payload.code === "unavailable") {
        router.refresh();
        return;
      }
      if (payload.code === "conflict") {
        setIsConflict(true);
        return;
      }
      if (!response.ok) {
        setFields(payload.fields ?? {});
        throw new Error(payload.error ?? t("edit.validation.saveFailed"));
      }
      const finalVisibility = payload.visibility ?? values.visibility;
      await queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all });
      setIsDirty(false);
      toast.success(t("edit.success"));
      router.push(detailRoute(memory.id, finalVisibility));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("edit.validation.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    addPhotos,
    coverPhotoKey,
    fields,
    isConflict,
    isSubmitting,
    photos,
    reload,
    removePhoto,
    selectCoverPhoto,
    submit,
    submitError,
    updateValue,
    values,
  };
}
