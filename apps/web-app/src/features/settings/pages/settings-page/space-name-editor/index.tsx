"use client";

import { Check, Pencil, RefreshCw, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/shadcn-button";
import { useSpaceNameEditor } from "../use-space-name-editor";
import styles from "./space-name-editor.module.css";

type SpaceNameEditorProps = { name: string; updatedAt: string; onSaved: (name: string) => void };

export function SpaceNameEditor({ name, updatedAt, onSaved }: Readonly<SpaceNameEditorProps>) {
  const { t } = useTranslation("settings");
  const inputRef = useRef<HTMLInputElement>(null);
  const editor = useSpaceNameEditor({ name, onSaved, updatedAt });

  useEffect(() => {
    if (editor.isEditing) inputRef.current?.focus();
  }, [editor.isEditing]);

  if (!editor.isEditing) {
    return (
      <div className={styles.value}>
        <strong>{editor.canonicalName}</strong>
        <Button
          aria-label={t("spaceName.edit")}
          onClick={editor.startEditing}
          size="sm"
          type="button"
          variant="outline"
        >
          <Pencil aria-hidden="true" />
          {t("spaceName.edit")}
        </Button>
        {editor.outcome === "success" ? <p role="status">{t("spaceName.success")}</p> : null}
      </div>
    );
  }
  const fieldError =
    editor.hasAttemptedSave && editor.validationError ? t("spaceName.validation") : null;
  return (
    <div className={styles.editor}>
      <label htmlFor="space-name">{t("shared.name")}</label>
      <input
        aria-describedby={fieldError ? "space-name-error" : undefined}
        aria-invalid={Boolean(fieldError)}
        disabled={editor.isSaving}
        id="space-name"
        onChange={(event) => editor.updateDraft(event.target.value)}
        ref={inputRef}
        value={editor.draft}
      />
      {fieldError ? (
        <p id="space-name-error" role="alert">
          {fieldError}
        </p>
      ) : null}
      {editor.isConflict ? (
        <div className={styles.conflict} role="alert">
          <p>{t("spaceName.conflict", { name: editor.canonicalName })}</p>
          <Button onClick={editor.acceptCurrent} size="sm" type="button" variant="outline">
            {t("spaceName.acceptCurrent")}
          </Button>
          <Button disabled={editor.isSaving} onClick={editor.save} size="sm" type="button">
            <RefreshCw aria-hidden="true" />
            {t("spaceName.retry")}
          </Button>
        </div>
      ) : null}
      {editor.outcome === "failed" ? <p role="alert">{t("spaceName.failed")}</p> : null}
      <div className={styles.actions}>
        <Button
          disabled={editor.isSaving}
          onClick={editor.cancel}
          size="sm"
          type="button"
          variant="outline"
        >
          <X aria-hidden="true" />
          {t("spaceName.cancel")}
        </Button>
        <Button disabled={editor.isSaving} onClick={editor.save} size="sm" type="button">
          {editor.isSaving ? (
            t("spaceName.pending")
          ) : (
            <>
              <Check aria-hidden="true" />
              {t("spaceName.save")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
