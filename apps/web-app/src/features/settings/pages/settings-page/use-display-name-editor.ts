import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { api } from "@/lib/axios/api";
import type { ApiResponse } from "@/types/api-response";
import { getCurrentSettings } from "../../api/get-current-settings";

export function getDisplayNameError(displayName: string): "length" | null {
  const length = Array.from(displayName.trim()).length;
  return length < 2 || length > 100 ? "length" : null;
}

type DisplayNameResponse = {
  displayName: string;
  updatedAt: string;
  status: "updated";
};

type UseDisplayNameEditorOptions = {
  displayName: string;
  updatedAt: string;
  onSaved: (displayName: string, updatedAt: string) => void;
};

export function useDisplayNameEditor({
  displayName,
  updatedAt,
  onSaved,
}: UseDisplayNameEditorOptions) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const revisionRef = useRef(updatedAt);
  const [canonicalDisplayName, setCanonicalDisplayName] = useState(displayName);
  const [draft, setDraft] = useState(displayName);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConflict, setIsConflict] = useState(false);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [outcome, setOutcome] = useState<"failed" | "success" | null>(null);
  const [, startTransition] = useTransition();
  const validationError = getDisplayNameError(draft);

  const startEditing = () => {
    revisionRef.current = updatedAt;
    setDraft(canonicalDisplayName);
    setHasAttemptedSave(false);
    setIsConflict(false);
    setOutcome(null);
    setIsEditing(true);
  };
  const updateDraft = (value: string) => {
    if (requestInFlight.current) return;
    setDraft(value);
    setIsConflict(false);
    setOutcome(null);
  };
  const cancel = () => {
    if (requestInFlight.current) return;
    setDraft(canonicalDisplayName);
    setHasAttemptedSave(false);
    setIsConflict(false);
    setOutcome(null);
    setIsEditing(false);
  };
  const acceptCurrent = () => {
    setDraft(canonicalDisplayName);
    setHasAttemptedSave(false);
    setIsConflict(false);
    setOutcome(null);
    setIsEditing(false);
    onSaved(canonicalDisplayName, revisionRef.current);
  };
  const save = async () => {
    if (requestInFlight.current) return;
    if (validationError) {
      setHasAttemptedSave(true);
      return;
    }
    requestInFlight.current = true;
    setIsSaving(true);
    setIsConflict(false);
    setOutcome(null);
    try {
      const response = await api.patch<ApiResponse<DisplayNameResponse | null>>(
        "/memberships/display-name",
        {
          displayName: draft,
          expectedUpdatedAt: revisionRef.current,
        },
        { validateStatus: (status) => status === 200 || status === 409 },
      );
      const canonical = response.data.data;
      if (response.status === 200 && canonical) {
        revisionRef.current = canonical.updatedAt;
        setCanonicalDisplayName(canonical.displayName);
        setDraft(canonical.displayName);
        setHasAttemptedSave(false);
        setIsEditing(false);
        setOutcome("success");
        onSaved(canonical.displayName, canonical.updatedAt);
        startTransition(() => router.refresh());
        return;
      }
      if (response.status === 409) {
        const settings = await getCurrentSettings();
        const currentMember = settings.activeMembers.find((member) => member.isCurrentMember);
        if (!currentMember) throw new Error("Current membership is unavailable.");
        revisionRef.current = currentMember.updatedAt;
        setCanonicalDisplayName(currentMember.displayName);
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
    canonicalDisplayName,
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
