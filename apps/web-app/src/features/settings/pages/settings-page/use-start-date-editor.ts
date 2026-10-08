import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { api } from "@/lib/axios/api";
import type { ApiResponse } from "@/types/api-response";
import { parseCalendarDate } from "@/utils/calendar-date";
import { getCurrentSettings } from "../../api/get-current-settings";

type StartDateResponse = { startDate: string; updatedAt: string; status: "updated" };

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
      const response = await api.patch<ApiResponse<StartDateResponse | null>>(
        "/spaces/start-date",
        {
          expectedUpdatedAt: revisionRef.current,
          startDate: draft,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        { validateStatus: (status) => status === 200 || status === 409 },
      );
      const canonical = response.data.data;
      if (response.status === 200 && canonical) {
        revisionRef.current = canonical.updatedAt;
        setCanonicalStartDate(canonical.startDate);
        setDraft(canonical.startDate);
        setHasAttemptedSave(false);
        setIsEditing(false);
        setOutcome("success");
        onSaved(canonical.startDate, canonical.updatedAt);
        startTransition(() => router.refresh());
        return;
      }
      if (response.status === 409) {
        const settings = await getCurrentSettings();
        revisionRef.current = settings.space.updatedAt;
        setCanonicalStartDate(settings.space.startDate);
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
