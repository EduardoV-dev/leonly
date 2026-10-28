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
import { createUuidV7 } from "../../utils/create-uuid-v7";
import {
  CREATE_MEMORY_DRAFT_KEY,
  clearMemoryDraft,
  readMemoryDraft,
  writeMemoryDraft,
} from "../../utils/memory-draft-storage";
import {
  MemoryCreationRequestError,
  type PreparedCreationUpload,
  submitMemoryCreation,
} from "./create-memory-request";

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

export function useCreateMemoryForm() {
  const { t } = useTranslation("memories");
  const router = useRouter();
  const queryClient = useQueryClient();
  const preparedUpload = useRef<PreparedCreationUpload | null>(null);
  const idempotencyKey = useRef(createUuidV7());
  const submissionInFlight = useRef(false);
  const hasCommitted = useRef(false);
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
    idempotencyKey.current = createUuidV7();
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
    if (submissionInFlight.current || values[key] === value) return;
    resetPreparedUpload();
    clearFieldError(key);
    setValues((current) => ({ ...current, [key]: value }));
  };
  const addPhotos = (files: File[]) => {
    if (submissionInFlight.current || files.length === 0) return;
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
      const id = createUuidV7();
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
    if (submissionInFlight.current) return;
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
    if (submissionInFlight.current || coverPhotoKey === key) return;
    resetPreparedUpload();
    clearFieldError("photos");
    setCoverPhotoKey(key);
  };
  const submit = async () => {
    if (submissionInFlight.current || hasCommitted.current) return;
    submissionInFlight.current = true;
    setFields({});
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const memory = await submitMemoryCreation({
        preparedUpload: preparedUpload.current,
        values,
        coverPhotoKey,
        idempotencyKey: idempotencyKey.current,
        onPrepared: (prepared) => {
          preparedUpload.current = prepared;
        },
        photos,
      });
      hasCommitted.current = true;
      await queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all });
      preparedUpload.current = null;
      discardDraft();
      router.push(
        memory.visibility === "vault"
          ? APP_ROUTES.VAULT_MEMORY_DETAIL(memory.id)
          : APP_ROUTES.TIMELINE,
      );
    } catch (error) {
      if (error instanceof MemoryCreationRequestError) {
        const fieldErrors = error.errors.flatMap(({ field }) => {
          if (!field) return [];
          const isPhotoField =
            field.startsWith("files") || field === "uploadIds" || field === "coverUploadId";
          const localField = isPhotoField ? "photos" : field;
          const hasVisibleField = [
            "title",
            "memoryDate",
            "description",
            "location",
            "photos",
          ].includes(localField);
          if (!hasVisibleField) return [];
          return [[localField, t("create.validation.serverInvalid")]];
        });
        if (fieldErrors.length > 0) {
          setFields(Object.fromEntries(fieldErrors));
          return;
        }
        const isInProgress = error.errors.some(({ code }) => code === "CREATION_IN_PROGRESS");
        if (isInProgress) {
          setSubmitError(t("create.validation.inProgress"));
          return;
        }
      }
      setSubmitError(t("create.validation.saveFailed"));
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  let draftNotice: string | null = null;
  if (draftWasRestored) {
    draftNotice = t("create.draft.restored");
    if (restoredPhotoNames.length > 0) {
      draftNotice = t("create.draft.restoredWithPhotos", { photos: restoredPhotoNames.join(", ") });
    }
  }

  return {
    coverPhotoKey,
    fields,
    draftNotice,
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
