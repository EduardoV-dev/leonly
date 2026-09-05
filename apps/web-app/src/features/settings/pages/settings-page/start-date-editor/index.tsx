"use client";

import { Check, Pencil, RefreshCw, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PastDatePicker } from "@/components/past-date-picker";
import { Button } from "@/components/ui/shadcn-button";
import { useStartDateEditor } from "../use-start-date-editor";
import styles from "./start-date-editor.module.css";

type StartDateEditorProps = {
  displayValue: string;
  onSaved: (startDate: string, updatedAt: string) => void;
  startDate: string;
  updatedAt: string;
};

export function StartDateEditor({
  displayValue,
  startDate,
  updatedAt,
  onSaved,
}: Readonly<StartDateEditorProps>) {
  const { t } = useTranslation("settings");
  const editor = useStartDateEditor({ onSaved, startDate, updatedAt });
  const editButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!editor.isEditing) editButtonRef.current?.focus();
  }, [editor.isEditing]);

  if (!editor.isEditing) {
    return (
      <div className={styles.value}>
        <strong>{displayValue}</strong>
        <Button
          aria-label={t("startDate.edit")}
          onClick={editor.startEditing}
          ref={editButtonRef}
          size="sm"
          type="button"
          variant="outline"
        >
          <Pencil aria-hidden="true" />
          {t("startDate.edit")}
        </Button>
        {editor.outcome === "success" ? <p role="status">{t("startDate.success")}</p> : null}
      </div>
    );
  }

  const fieldError =
    editor.hasAttemptedSave && editor.validationError ? t("startDate.validation") : null;
  return (
    <div className={styles.editor}>
      <PastDatePicker
        describedBy={fieldError ? "start-date-error" : undefined}
        id="start-date"
        isInvalid={Boolean(fieldError)}
        label={t("shared.startDate")}
        onChange={editor.updateDraft}
        placeholder={t("startDate.placeholder")}
        value={editor.draft}
      />
      {fieldError ? (
        <p id="start-date-error" role="alert">
          {fieldError}
        </p>
      ) : null}
      {editor.isConflict ? (
        <div className={styles.conflict} role="alert">
          <p>{t("startDate.conflict", { date: editor.canonicalStartDate })}</p>
          <Button onClick={editor.acceptCurrent} size="sm" type="button" variant="outline">
            {t("startDate.acceptCurrent")}
          </Button>
          <Button disabled={editor.isSaving} onClick={editor.save} size="sm" type="button">
            <RefreshCw aria-hidden="true" />
            {t("startDate.retry")}
          </Button>
        </div>
      ) : null}
      {editor.outcome === "failed" ? <p role="alert">{t("startDate.failed")}</p> : null}
      <div className={styles.actions}>
        <Button
          disabled={editor.isSaving}
          onClick={editor.cancel}
          size="sm"
          type="button"
          variant="outline"
        >
          <X aria-hidden="true" />
          {t("startDate.cancel")}
        </Button>
        <Button disabled={editor.isSaving} onClick={editor.save} size="sm" type="button">
          {editor.isSaving ? (
            t("startDate.pending")
          ) : (
            <>
              <Check aria-hidden="true" />
              {t("startDate.save")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
