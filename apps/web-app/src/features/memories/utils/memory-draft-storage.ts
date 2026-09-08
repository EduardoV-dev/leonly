import type { MemoryEditorValues } from "../types/memory-editor";

export type StoredMemoryDraft = {
  coverPhotoId: string | null;
  newPhotoNames: string[];
  retainedPhotoIds: string[];
  values: MemoryEditorValues;
};

export const CREATE_MEMORY_DRAFT_KEY = "leonly:memory-draft:create:v1";

export function getEditMemoryDraftKey(memoryId: string, version: string): string {
  return `leonly:memory-draft:edit:${memoryId}:${version}:v1`;
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isMemoryEditorValues(value: unknown): value is MemoryEditorValues {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MemoryEditorValues>;

  return (
    typeof candidate.description === "string" &&
    typeof candidate.location === "string" &&
    typeof candidate.memoryDate === "string" &&
    typeof candidate.title === "string" &&
    (candidate.visibility === "timeline" || candidate.visibility === "vault")
  );
}

export function readMemoryDraft(storageKey: string): StoredMemoryDraft | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const rawDraft = storage.getItem(storageKey);
    if (!rawDraft) return null;
    const candidate = JSON.parse(rawDraft) as Partial<StoredMemoryDraft>;

    if (
      !isMemoryEditorValues(candidate.values) ||
      !isStringArray(candidate.newPhotoNames) ||
      !isStringArray(candidate.retainedPhotoIds) ||
      (candidate.coverPhotoId !== null && typeof candidate.coverPhotoId !== "string")
    ) {
      clearMemoryDraft(storageKey);
      return null;
    }

    return {
      coverPhotoId: candidate.coverPhotoId,
      newPhotoNames: candidate.newPhotoNames,
      retainedPhotoIds: candidate.retainedPhotoIds,
      values: candidate.values,
    };
  } catch {
    clearMemoryDraft(storageKey);
    return null;
  }
}

export function writeMemoryDraft(storageKey: string, draft: StoredMemoryDraft): void {
  try {
    getSessionStorage()?.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Draft recovery is best-effort when browser storage is unavailable.
  }
}

export function clearMemoryDraft(storageKey: string): void {
  try {
    getSessionStorage()?.removeItem(storageKey);
  } catch {
    // Navigation and saving must still work when browser storage is unavailable.
  }
}
