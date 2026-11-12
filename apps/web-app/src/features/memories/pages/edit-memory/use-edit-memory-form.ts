"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { toast } from "@/utils/toast";
import {
  ACCEPTED_MEMORY_PHOTO_EXTENSIONS,
  MAX_MEMORY_PHOTO_COUNT,
  MAX_MEMORY_PHOTO_SIZE_BYTES,
} from "../../constants/create-memory";
import { memoryQueryKeys } from "../../constants/query-keys";
import { useMemoryDraftProtection } from "../../hooks/use-memory-draft-protection";
import { revalidatePlacementViews } from "../../server/revalidate-placement-views";
import type { MemoryEdit } from "../../types/memory-edit";
import type { MemoryEditorPhoto, MemoryEditorValues } from "../../types/memory-editor";
import { createUuidV7 } from "../../utils/create-uuid-v7";
import {
  clearMemoryDraft,
  getEditMemoryDraftKey,
  readMemoryDraft,
  writeMemoryDraft,
} from "../../utils/memory-draft-storage";
import { type PreparedEditUpload, submitMemoryEdit } from "./edit-memory-request";

const VISIBLE_FIELDS = ["title", "memoryDate", "description", "location", "photos"] as const;
const PHOTO_FIELDS = new Set(["retainedPhotoIds", "uploadIds", "coverFileId"]);

function toLocalField(field: string): string {
  if (PHOTO_FIELDS.has(field)) return "photos";
  if (field === "timezone") return "memoryDate";

  return field;
}

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
  const preparedUpload = useRef<PreparedEditUpload | null>(null);
  const submissionInFlight = useRef(false);
  const hasCommitted = useRef(false);
  const isMounted = useRef(true);
  const nextPhotoKey = useRef(0);
  const previewUrls = useRef(new Set<string>());
  const storageKey = getEditMemoryDraftKey(memory.id, memory.version);
  const initialDraft = toDraft(memory);
  const [values, setValues] = useState<MemoryEditorValues>(initialDraft.values);
  const [photos, setPhotos] = useState<MemoryEditorPhoto[]>(initialDraft.photos);
  const [coverPhotoKey, setCoverPhotoKey] = useState<string | null>(initialDraft.coverPhotoKey);
  const [draftWasRestored, setDraftWasRestored] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [isBlockedState, setIsBlockedState] = useState<null | "conflict" | "uncertain">(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restoredPhotoNames, setRestoredPhotoNames] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);
  useEffect(() => {
    const draft = toDraft(memory);
    const storedDraft = readMemoryDraft(storageKey);
    previewUrls.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    previewUrls.current.clear();
    const retainedPhotoIds = new Set(storedDraft?.retainedPhotoIds);
    const restoredPhotos = storedDraft
      ? draft.photos.filter((photo) => photo.kind === "retained" && retainedPhotoIds.has(photo.id))
      : draft.photos;
    const restoredCoverKey = storedDraft?.coverPhotoId
      ? `retained-${storedDraft.coverPhotoId}`
      : null;
    setValues(storedDraft?.values ?? draft.values);
    setPhotos(restoredPhotos);
    setCoverPhotoKey(
      restoredPhotos.some((photo) => photo.key === restoredCoverKey)
        ? restoredCoverKey
        : (restoredPhotos[0]?.key ?? null),
    );
    setDraftWasRestored(Boolean(storedDraft));
    setRestoredPhotoNames(storedDraft?.newPhotoNames ?? []);
    setFields({});
    setHasLoadedDraft(true);
    setIsBlockedState(null);
    setIsDirty(Boolean(storedDraft));
    setSubmitError(null);
    preparedUpload.current = null;
  }, [memory, storageKey]);
  useEffect(() => {
    if (!hasLoadedDraft || !isDirty) return;
    const coverPhoto = photos.find((photo) => photo.key === coverPhotoKey);
    writeMemoryDraft(storageKey, {
      coverPhotoId: coverPhoto?.kind === "retained" ? coverPhoto.id : null,
      newPhotoNames: [
        ...new Set([
          ...restoredPhotoNames,
          ...photos.filter((photo) => photo.kind === "new").map((photo) => photo.name),
        ]),
      ],
      retainedPhotoIds: photos
        .filter((photo) => photo.kind === "retained")
        .map((photo) => photo.id),
      values,
    });
  }, [coverPhotoKey, hasLoadedDraft, isDirty, photos, restoredPhotoNames, storageKey, values]);
  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    },
    [],
  );

  const discardDraft = () => {
    clearMemoryDraft(storageKey);
    setIsDirty(false);
  };
  useMemoryDraftProtection({
    isDirty,
    message: t("create.draft.exitWarning"),
    onDiscard: discardDraft,
  });

  const clearFieldError = (field: string) =>
    setFields((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  const changeDraft = (field: string) => {
    preparedUpload.current = null;
    clearFieldError(field);
    setIsDirty(true);
    setSubmitError(null);
  };
  const updateValue = <TKey extends keyof MemoryEditorValues>(
    key: TKey,
    value: MemoryEditorValues[TKey],
  ) => {
    if (isBlockedState || submissionInFlight.current || values[key] === value) return;
    changeDraft(key);
    setValues((current) => ({ ...current, [key]: value }));
  };
  const addPhotos = (files: File[]) => {
    if (isBlockedState || submissionInFlight.current || files.length === 0) return;
    if (photos.length + files.length > MAX_MEMORY_PHOTO_COUNT) {
      setFields((current) => ({
        ...current,
        photos: t("edit.validation.photoCount", { count: MAX_MEMORY_PHOTO_COUNT }),
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
    changeDraft("photos");
    const selectedNames = new Set(files.map((file) => file.name));
    setRestoredPhotoNames((current) => current.filter((name) => !selectedNames.has(name)));
    setPhotos((current) => [...current, ...additions]);
    setCoverPhotoKey((current) => current ?? additions[0]?.key ?? null);
  };
  const removePhoto = (key: string) => {
    if (isBlockedState || submissionInFlight.current) return;
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
    if (isBlockedState || submissionInFlight.current || coverPhotoKey === key) return;
    changeDraft("photos");
    setCoverPhotoKey(key);
  };
  const reload = () => {
    discardDraft();
    preparedUpload.current = null;
    router.refresh();
  };
  const submit = async () => {
    if (submissionInFlight.current || hasCommitted.current || isBlockedState) return;
    submissionInFlight.current = true;
    setFields({});
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const outcome = await submitMemoryEdit({
        memory,
        values,
        photos,
        coverPhotoKey,
        preparedUpload: preparedUpload.current,
        onPrepared: (prepared) => {
          preparedUpload.current = prepared;
        },
      });
      if (!isMounted.current) return;

      if (outcome.status === "unauthorized") {
        router.replace(APP_ROUTES.AUTH);
        return;
      }
      if (outcome.status === "unavailable") {
        preparedUpload.current = null;
        discardDraft();
        router.refresh();
        return;
      }
      if (outcome.status === "conflict") {
        preparedUpload.current = null;
        setIsBlockedState("conflict");
        return;
      }
      if (outcome.status === "uncertain") {
        preparedUpload.current = null;
        setIsBlockedState("uncertain");
        return;
      }
      if (outcome.status === "invalid") {
        const fieldErrors = outcome.errors.flatMap(({ field }) => {
          if (!field) return [];
          const localField = toLocalField(field);
          if (!VISIBLE_FIELDS.includes(localField as (typeof VISIBLE_FIELDS)[number])) return [];
          return [[localField, t("edit.validation.serverInvalid")]] as const;
        });
        if (fieldErrors.length > 0) {
          setFields(Object.fromEntries(fieldErrors));
          return;
        }
        setSubmitError(t("edit.validation.saveFailed"));
        return;
      }
      if (outcome.status === "retryable") {
        setSubmitError(t("edit.validation.saveFailed"));
        return;
      }

      hasCommitted.current = true;
      await queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all, refetchType: "none" });
      queryClient.removeQueries({ queryKey: memoryQueryKeys.all });
      preparedUpload.current = null;
      discardDraft();
      const finalVisibility = outcome.result.visibility;
      try {
        await revalidatePlacementViews({ memoryId: memory.id, visibility: finalVisibility });
      } catch {
        toast.error(t("detail.placement.refreshFailed"));
      }
      toast.success(t("edit.success"));
      router.push(detailRoute(memory.id, finalVisibility));
      router.refresh();
    } catch {
      if (isMounted.current) setSubmitError(t("edit.validation.saveFailed"));
    } finally {
      submissionInFlight.current = false;
      if (isMounted.current) setIsSubmitting(false);
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
    addPhotos,
    coverPhotoKey,
    draftNotice,
    fields,
    isBlockedState,
    isConflict: isBlockedState === "conflict",
    isUncertain: isBlockedState === "uncertain",
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
