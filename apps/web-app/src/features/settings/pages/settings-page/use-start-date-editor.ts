import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { z } from "zod";
import { parseCalendarDate } from "@/utils/calendar-date";

const responseSchema = z.object({
  startDate: z.iso.date(),
  updatedAt: z.string().datetime({ offset: true }),
});
const conflictSchema = z.object({
  code: z.literal("conflict"),
  startDate: z.iso.date(),
  updatedAt: z.string().datetime({ offset: true }),
});

type UseStartDateEditorOptions = {
  onSaved: (startDate: string, updatedAt: string) => void;
  startDate: string;
  updatedAt: string;
};

export function useStartDateEditor({ startDate, updatedAt, onSaved }: UseStartDateEditorOptions) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const revisionRef = useRef(updatedAt);
  const [canonicalStartDate, setCanonicalStartDate] = useState(startDate);
  const [draft, setDraft] = useState(startDate);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConflict, setIsConflict] = useState(false);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [outcome, setOutcome] = useState<"failed" | "success" | null>(null);
  const [, startTransition] = useTransition();
  const validationError = parseCalendarDate(draft) === null;

  const startEditing = () => {
    revisionRef.current = updatedAt;
    setDraft(canonicalStartDate);
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
    setDraft(canonicalStartDate);
    setHasAttemptedSave(false);
    setIsConflict(false);
    setOutcome(null);
    setIsEditing(false);
  };
  const acceptCurrent = () => {
    setDraft(canonicalStartDate);
    setHasAttemptedSave(false);
    setIsConflict(false);
    setOutcome(null);
    setIsEditing(false);
    onSaved(canonicalStartDate, revisionRef.current);
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
      const response = await fetch("/api/spaces/start-date", {
        body: JSON.stringify({
          expectedUpdatedAt: revisionRef.current,
          startDate: draft,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload: unknown = await response.json().catch(() => null);
      const success = responseSchema.safeParse(payload);
      if (response.ok && success.success) {
        revisionRef.current = success.data.updatedAt;
        setCanonicalStartDate(success.data.startDate);
        setDraft(success.data.startDate);
        setHasAttemptedSave(false);
        setIsEditing(false);
        setOutcome("success");
        onSaved(success.data.startDate, success.data.updatedAt);
        startTransition(() => router.refresh());
        return;
      }
      const conflict = conflictSchema.safeParse(payload);
      if (response.status === 409 && conflict.success) {
        revisionRef.current = conflict.data.updatedAt;
        setCanonicalStartDate(conflict.data.startDate);
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
    canonicalStartDate,
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
