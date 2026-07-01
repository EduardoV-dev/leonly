import { CharacterCount } from "@/components/character-count";
import { ArrowRight } from "lucide-react";
import type { Control, FieldError } from "react-hook-form";
import { useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { SetupTabs } from "../../../components/setup-tabs";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { DISPLAY_NAME_MAX_LENGTH } from "../../../constants/validation";
import type { CreateSpaceSetupFormValues } from "../../../hooks/use-create-space-setup-form";

type CreateStartStepProps = {
  control: Control<CreateSpaceSetupFormValues>;
  displayNameError?: FieldError;
  onContinue: () => void;
};

export function CreateStartStep({ control, displayNameError, onContinue }: CreateStartStepProps) {
  const { t } = useTranslation("spaceSetup");
  const displayNameErrorId = "display-name-error";
  const { field } = useController({
    control,
    name: "displayName",
  });
  const displayNameValue = field.value ?? "";

  return (
    <div>
      <SetupTabs activeTab="create" />

      <h1 className={styles.heading}>{t("steps.start.heading")}</h1>
      <p className={styles.copy}>{t("steps.start.description")}</p>

      <div className={styles.formGroup} data-setup-field>
        <label className={styles.label} htmlFor="display-name">
          {t("steps.start.displayNameLabel")}
          <span className={styles.optional}>{t("steps.start.optional")}</span>
        </label>
        <input
          id="display-name"
          type="text"
          placeholder={t("steps.start.displayNamePlaceholder")}
          className={styles.input}
          aria-describedby={displayNameError ? displayNameErrorId : undefined}
          aria-invalid={Boolean(displayNameError)}
          {...field}
          value={displayNameValue}
        />
        <div className={styles.fieldMeta}>
          {displayNameError ? (
            <p id={displayNameErrorId} className={styles.fieldError}>
              {displayNameError.message}
            </p>
          ) : (
            <span />
          )}
          <CharacterCount value={displayNameValue} max={DISPLAY_NAME_MAX_LENGTH} />
        </div>
      </div>

      <button type="button" className={styles.linkButton} onClick={onContinue}>
        {t("actions.continue")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
