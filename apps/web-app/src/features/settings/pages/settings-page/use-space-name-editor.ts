import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { api } from "@/lib/axios/api";
import type { ApiResponse } from "@/types/api-response";
import { getCurrentSettings } from "../../api/get-current-settings";

type SpaceNameResponse = { name: string; updatedAt: string; status: "updated" };

export function getSpaceNameError(name: string): "length" | null {
  const length = Array.from(name.trim()).length;
  return length < 2 || length > 100 ? "length" : null;
}

type UseSpaceNameEditorOptions = {
  name: string;
  updatedAt: string;
  onSaved: (name: string, updatedAt: string) => void;
};

export function useSpaceNameEditor({ name, updatedAt, onSaved }: UseSpaceNameEditorOptions) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const revisionRef = useRef(updatedAt);
  const [canonicalName, setCanonicalName] = useState(name);
  const [draft, setDraft] = useState(name);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConflict, setIsConflict] = useState(false);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [outcome, setOutcome] = useState<"failed" | "success" | null>(null);
  const [, startTransition] = useTransition();
  const validationError = getSpaceNameError(draft);

  const startEditing = () => {
    revisionRef.current = updatedAt;
    setDraft(canonicalName);
    setHasAttemptedSave(false);
    setIsConflict(false);
    setOutcome(null);
    setIsEditing(true);
  };
  const updateDraft = (value: string) => {
    if (isSaving) return;
    setDraft(value);
    setIsConflict(false);
    setOutcome(null);
  };
  const cancel = () => {
    setDraft(canonicalName);
    setHasAttemptedSave(false);
    setIsConflict(false);
    setOutcome(null);
    setIsEditing(false);
  };
  const acceptCurrent = () => {
    setDraft(canonicalName);
    setHasAttemptedSave(false);
    setIsConflict(false);
    setOutcome(null);
    setIsEditing(false);
    onSaved(canonicalName, revisionRef.current);
  };
  const save = async () => {
    if (requestInFlight.current || isSaving) return;
    if (validationError) {
      setHasAttemptedSave(true);
      return;
    }
    requestInFlight.current = true;
    setIsSaving(true);
    setIsConflict(false);
    setOutcome(null);
    try {
      const response = await api.patch<ApiResponse<SpaceNameResponse | null>>(
        "/spaces/name",
        {
          expectedUpdatedAt: revisionRef.current,
          name: draft,
        },
        { validateStatus: (status) => status === 200 || status === 409 },
      );
      const canonical = response.data.data;
      if (response.status === 200 && canonical) {
        revisionRef.current = canonical.updatedAt;
        setCanonicalName(canonical.name);
        setDraft(canonical.name);
        setHasAttemptedSave(false);
        setIsEditing(false);
        setOutcome("success");
        onSaved(canonical.name, canonical.updatedAt);
        startTransition(() => router.refresh());
        return;
      }
      if (response.status === 409) {
        const settings = await getCurrentSettings();
        revisionRef.current = settings.space.updatedAt;
        setCanonicalName(settings.space.name);
        setIsConflict(true);
        return;
      }
      setOutcome("failed");
    } catch {
      setOutcome("failed");
    } finally {
      requestInFlight.current = false;
      setIsSaving(false);
    }
  };

  return {
    acceptCurrent,
    cancel,
    canonicalName,
    draft,
    hasAttemptedSave,
    isConflict,
    isEditing,
    isSaving,
    outcome,
    save,
    startEditing,
    updateDraft,
    validationError,
  };
}
