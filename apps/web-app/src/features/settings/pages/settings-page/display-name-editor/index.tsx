"use client";

import { Check, Pencil, RefreshCw, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/shadcn-button";
import { useDisplayNameEditor } from "../use-display-name-editor";
import styles from "./display-name-editor.module.css";

type DisplayNameEditorProps = {
  displayName: string;
  updatedAt: string;
  onSaved: (displayName: string, updatedAt: string) => void;
};

export function DisplayNameEditor({
  displayName,
  updatedAt,
  onSaved,
}: Readonly<DisplayNameEditorProps>) {
  const { t } = useTranslation("settings");
  const inputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const editor = useDisplayNameEditor({ displayName, onSaved, updatedAt });

  useEffect(() => {
    if (editor.isEditing) inputRef.current?.focus();
    else editButtonRef.current?.focus();
  }, [editor.isEditing]);

  if (!editor.isEditing) {
    return (
      <div className={styles.value}>
        <strong>{editor.canonicalDisplayName}</strong>
        <Button
          aria-label={t("displayName.edit")}
          onClick={editor.startEditing}
          ref={editButtonRef}
          size="sm"
          type="button"
          variant="outline"
        >
          <Pencil aria-hidden="true" />
          {t("displayName.edit")}
        </Button>
        {editor.outcome === "success" ? <p role="status">{t("displayName.success")}</p> : null}
      </div>
    );
  }

  const fieldError =
    editor.hasAttemptedSave && editor.validationError ? t("displayName.validation") : null;
  return (
    <form
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        void editor.save();
      }}
    >
      <label htmlFor="display-name">{t("preferences.displayName")}</label>
      <input
        aria-describedby={fieldError ? "display-name-help display-name-error" : "display-name-help"}
        aria-invalid={Boolean(fieldError)}
        disabled={editor.isSaving}
        id="display-name"
        onChange={(event) => editor.updateDraft(event.target.value)}
        ref={inputRef}
        value={editor.draft}
      />
      <p className={styles.help} id="display-name-help">
        {t("preferences.displayNameHelp")}
      </p>
      {fieldError ? (
        <p id="display-name-error" role="alert">
          {fieldError}
        </p>
      ) : null}
      {editor.isConflict ? (
        <div className={styles.conflict} role="alert">
          <p>{t("displayName.conflict", { name: editor.canonicalDisplayName })}</p>
          <Button onClick={editor.acceptCurrent} size="sm" type="button" variant="outline">
            {t("displayName.acceptCurrent")}
          </Button>
          <Button disabled={editor.isSaving} size="sm" type="submit">
            <RefreshCw aria-hidden="true" />
            {t("displayName.retry")}
          </Button>
        </div>
      ) : null}
      {editor.isSaving ? <p role="status">{t("displayName.pending")}</p> : null}
      {editor.outcome === "failed" ? <p role="alert">{t("displayName.failed")}</p> : null}
      <div className={styles.actions}>
        <Button
          disabled={editor.isSaving}
          onClick={editor.cancel}
          size="sm"
          type="button"
          variant="outline"
        >
          <X aria-hidden="true" />
          {t("displayName.cancel")}
        </Button>
        <Button disabled={editor.isSaving} size="sm" type="submit">
          {editor.isSaving ? (
            t("displayName.pending")
          ) : (
            <>
              <Check aria-hidden="true" />
              {t("displayName.save")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
