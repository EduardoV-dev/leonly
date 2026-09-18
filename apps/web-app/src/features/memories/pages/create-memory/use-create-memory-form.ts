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
import { useMemoryDraftProtection } from "../../hooks/use-memory-draft-protection";
import type { MemoryEditorPhoto, MemoryEditorValues } from "../../types/memory-editor";
import {
  CREATE_MEMORY_DRAFT_KEY,
  clearMemoryDraft,
  readMemoryDraft,
  writeMemoryDraft,
} from "../../utils/memory-draft-storage";
import {
  type PreparedMemoryUpload,
  uploadStagedMemoryPhotos,
} from "../../utils/upload-staged-memory-photos";

type CreateMemoryResponse = { code?: string; fields?: Record<string, string>; id?: string };

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
  mutationId: string,
): FormData {
  const formData = new FormData();
  formData.set("title", values.title);
  formData.set("description", values.description);
  formData.set("location", values.location);
  formData.set("memoryDate", values.memoryDate);
  formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  formData.set("visibility", values.visibility);
  formData.set("mutationId", mutationId);
  const coverPhoto = photos.find((photo) => photo.key === coverPhotoKey);
  if (coverPhoto) formData.set("coverPhotoId", coverPhoto.id);
  for (const photo of photos) {
    if (photo.kind === "new") {
      formData.append("photoIds", photo.id);
      formData.append("photoNames", photo.name);
    }
  }
  return formData;
}

export function useCreateMemoryForm() {
  const { t } = useTranslation("memories");
  const router = useRouter();
  const queryClient = useQueryClient();
  const preparedUpload = useRef<PreparedMemoryUpload | null>(null);
  const mutationId = useRef(crypto.randomUUID());
  const nextPhotoKey = useRef(0);
  const previewUrls = useRef(new Set<string>());
  const [coverPhotoKey, setCoverPhotoKey] = useState<string | null>(null);
  const [draftWasRestored, setDraftWasRestored] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<MemoryEditorPhoto[]>([]);
  const [restoredPhotoNames, setRestoredPhotoNames] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [values, setValues] = useState<MemoryEditorValues>(initialValues);

  useEffect(() => {
    const draft = readMemoryDraft(CREATE_MEMORY_DRAFT_KEY);
    if (draft) {
      setValues(draft.values);
      setRestoredPhotoNames(draft.newPhotoNames);
      setDraftWasRestored(true);
      setIsDirty(true);
    }
    setHasLoadedDraft(true);
  }, []);
  useEffect(() => {
    if (!hasLoadedDraft || !isDirty) return;
    writeMemoryDraft(CREATE_MEMORY_DRAFT_KEY, {
      coverPhotoId: null,
      newPhotoNames: [
        ...new Set([
          ...restoredPhotoNames,
          ...photos.filter((photo) => photo.kind === "new").map((photo) => photo.name),
        ]),
      ],
      retainedPhotoIds: [],
      values,
    });
  }, [hasLoadedDraft, isDirty, photos, restoredPhotoNames, values]);
  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    },
    [],
  );

  const discardDraft = () => {
    clearMemoryDraft(CREATE_MEMORY_DRAFT_KEY);
    setIsDirty(false);
  };
  useMemoryDraftProtection({
    isDirty,
    message: t("create.draft.exitWarning"),
    onDiscard: discardDraft,
  });

  const resetPreparedUpload = () => {
    preparedUpload.current = null;
    mutationId.current = crypto.randomUUID();
    setSubmitError(null);
    setIsDirty(true);
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
    resetPreparedUpload();
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
      const id = crypto.randomUUID();
      nextPhotoKey.current += 1;
      return {
        file,
        id,
        key: `new-${nextPhotoKey.current}`,
        kind: "new",
        name: file.name,
        previewUrl,
      };
    });
    resetPreparedUpload();
    const selectedNames = new Set(files.map((file) => file.name));
    setRestoredPhotoNames((current) => current.filter((name) => !selectedNames.has(name)));
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
    resetPreparedUpload();
    clearFieldError("photos");
    setPhotos(remaining);
    setCoverPhotoKey((current) => (current === key ? (remaining[0]?.key ?? null) : current));
  };
  const selectCoverPhoto = (key: string) => {
    resetPreparedUpload();
    clearFieldError("photos");
    setCoverPhotoKey(key);
  };
  const submit = async () => {
    if (isSubmitting) return;
    setFields({});
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const response = await uploadStagedMemoryPhotos({
        preparedUpload: preparedUpload.current,
        finalMethod: "POST",
        finalUrl: "/api/memories",
        formData: createFormData(values, photos, coverPhotoKey, mutationId.current),
        onPrepared: (prepared) => {
          preparedUpload.current = prepared;
        },
        photos,
        prepareUrl: "/api/memories/uploads",
      });
      const payload = (await response.json()) as CreateMemoryResponse;
      if (!response.ok || !payload.id) {
        if (response.status < 500) preparedUpload.current = null;
        setFields(
          Object.fromEntries(
            Object.keys(payload.fields ?? {}).map((field) => [
              field,
              t("create.validation.serverInvalid"),
            ]),
          ),
        );
        throw new Error(
          payload.code === "validation_failed"
            ? t("create.validation.serverInvalid")
            : t("create.validation.saveFailed"),
        );
      }
      await queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all });
      preparedUpload.current = null;
      discardDraft();
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
    draftNotice: draftWasRestored
      ? restoredPhotoNames.length > 0
        ? t("create.draft.restoredWithPhotos", { photos: restoredPhotoNames.join(", ") })
        : t("create.draft.restored")
      : null,
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
