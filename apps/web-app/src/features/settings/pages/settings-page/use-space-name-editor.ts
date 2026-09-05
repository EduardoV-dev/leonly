import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { z } from "zod";

const responseSchema = z.object({
  name: z.string().min(2).max(100),
  updatedAt: z.string().datetime({ offset: true }),
});
const conflictSchema = z.object({
  code: z.literal("conflict"),
  name: z.string().min(2).max(100),
  updatedAt: z.string().datetime({ offset: true }),
});

export function getSpaceNameError(name: string): "length" | null {
  const length = Array.from(name.trim()).length;
  return length < 2 || length > 100 ? "length" : null;
}

type UseSpaceNameEditorOptions = {
  name: string;
  updatedAt: string;
  onSaved: (name: string) => void;
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
    onSaved(canonicalName);
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
      const response = await fetch("/api/spaces/name", {
        body: JSON.stringify({ expectedUpdatedAt: revisionRef.current, name: draft }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload: unknown = await response.json().catch(() => null);
      const success = responseSchema.safeParse(payload);
      if (response.ok && success.success) {
        revisionRef.current = success.data.updatedAt;
        setCanonicalName(success.data.name);
        setDraft(success.data.name);
        setHasAttemptedSave(false);
        setIsEditing(false);
        setOutcome("success");
        onSaved(success.data.name);
        startTransition(() => router.refresh());
        return;
      }
      const conflict = conflictSchema.safeParse(payload);
      if (response.status === 409 && conflict.success) {
        revisionRef.current = conflict.data.updatedAt;
        setCanonicalName(conflict.data.name);
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
