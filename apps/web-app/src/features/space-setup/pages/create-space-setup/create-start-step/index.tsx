import { ArrowRight } from "lucide-react";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { CharacterCount } from "@/components/character-count";
import { SetupTabs } from "../../../components/setup-tabs";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { CREATE_DISPLAY_NAME_MAX_LENGTH } from "../../../constants/validation";
import type { CreateSpaceSetupFormValues } from "../../../hooks/use-create-space-setup-form";

type CreateStartStepProps = {
  control: Control<CreateSpaceSetupFormValues>;
  onContinue: () => void;
};

export function CreateStartStep({ control, onContinue }: CreateStartStepProps) {
  const { t } = useTranslation("spaceSetup");
  const displayNameErrorId = "display-name-error";
  const { field, fieldState } = useController({
    control,
    name: "displayName",
  });
  const displayNameError = fieldState.error;
  const displayNameValue = field.value ?? "";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <SetupTabs activeTab="create" />

      <h1 className={styles.heading}>{t("steps.start.heading")}</h1>
      <p className={styles.copy}>{t("steps.start.description")}</p>

      <div className={styles.formGroup} data-setup-field>
        <label className={styles.label} htmlFor="display-name">
          {t("steps.start.displayNameLabel")}
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
            <p id={displayNameErrorId} className={styles.fieldError} role="alert">
              {displayNameError.message}
            </p>
          ) : (
            <span />
          )}
          <CharacterCount value={displayNameValue} max={CREATE_DISPLAY_NAME_MAX_LENGTH} />
        </div>
      </div>

      <button type="submit" className={styles.linkButton}>
        {t("actions.continue")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
