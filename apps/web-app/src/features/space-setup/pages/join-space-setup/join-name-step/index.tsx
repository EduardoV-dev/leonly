import { CharacterCount } from "@/components/character-count";
import type { Control, FieldError } from "react-hook-form";
import { useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { DISPLAY_NAME_MAX_LENGTH } from "../../../constants/validation";
import type { JoinSpaceSetupFormValues } from "../../../hooks/use-join-space-setup-form";

type JoinNameStepProps = {
  control: Control<JoinSpaceSetupFormValues>;
  displayNameError?: FieldError;
  onStartStory: () => void;
};

export function JoinNameStep({ control, displayNameError, onStartStory }: JoinNameStepProps) {
  const { t } = useTranslation("spaceSetup");
  const displayNameErrorId = "join-display-name-error";
  const { field } = useController({
    control,
    name: "displayName",
  });
  const displayNameValue = field.value ?? "";

  return (
    <div>
      <h1 className={styles.heading}>{t("steps.joinName.heading")}</h1>
      <p className={styles.copy}>{t("steps.joinName.description")}</p>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="join-display-name">
          {t("steps.joinName.displayNameLabel")}
          <span className={styles.optional}>{t("steps.joinName.optional")}</span>
        </label>
        <input
          id="join-display-name"
          type="text"
          placeholder={t("steps.joinName.displayNamePlaceholder")}
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

      <button type="button" className={styles.linkButton} onClick={onStartStory}>
        {t("actions.startStory")}
      </button>
    </div>
  );
}
