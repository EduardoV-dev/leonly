import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { z } from "zod";

export function getDisplayNameError(displayName: string): "length" | null {
  const length = Array.from(displayName.trim()).length;
  return length < 2 || length > 100 ? "length" : null;
}

const displayNameSchema = z.string().refine((value) => getDisplayNameError(value) === null);
const responseSchema = z.object({
  displayName: displayNameSchema,
  updatedAt: z.string().datetime({ offset: true }),
});
const conflictSchema = z.object({
  code: z.literal("conflict"),
  displayName: displayNameSchema,
  updatedAt: z.string().datetime({ offset: true }),
});

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
      const response = await fetch("/api/membership/display-name", {
        body: JSON.stringify({ displayName: draft, expectedUpdatedAt: revisionRef.current }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload: unknown = await response.json().catch(() => null);
      const success = responseSchema.safeParse(payload);
      if (response.ok && success.success) {
        revisionRef.current = success.data.updatedAt;
        setCanonicalDisplayName(success.data.displayName);
        setDraft(success.data.displayName);
        setHasAttemptedSave(false);
        setIsEditing(false);
        setOutcome("success");
        onSaved(success.data.displayName, success.data.updatedAt);
        startTransition(() => router.refresh());
        return;
      }
      const conflict = conflictSchema.safeParse(payload);
      if (response.status === 409 && conflict.success) {
        revisionRef.current = conflict.data.updatedAt;
        setCanonicalDisplayName(conflict.data.displayName);
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
