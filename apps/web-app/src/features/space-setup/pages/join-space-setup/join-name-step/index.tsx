import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { CharacterCount } from "@/components/character-count";
import { Button } from "@/components/ui/button";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { DISPLAY_NAME_MAX_LENGTH } from "../../../constants/validation";
import type { JoinSpaceSetupFormValues } from "../../../hooks/use-join-space-setup-form";

type JoinNameStepProps = {
  control: Control<JoinSpaceSetupFormValues>;
  isSubmitting: boolean;
  onStartStory: () => void;
  submitError: string | null;
};

export function JoinNameStep({
  control,
  isSubmitting,
  onStartStory,
  submitError,
}: JoinNameStepProps) {
  const { t } = useTranslation("spaceSetup");
  const displayNameErrorId = "join-display-name-error";
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
        onStartStory();
      }}
    >
      <h1 className={styles.heading}>{t("steps.joinName.heading")}</h1>
      <p className={styles.copy}>{t("steps.joinName.description")}</p>

      <div className={styles.formGroup} data-setup-field>
        <label className={styles.label} htmlFor="join-display-name">
          {t("steps.joinName.displayNameLabel")}
          <span className={styles.optional}>({t("steps.joinName.optional")})</span>
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
            <p id={displayNameErrorId} className={styles.fieldError} role="alert">
              {displayNameError.message}
            </p>
          ) : (
            <span />
          )}
          <CharacterCount value={displayNameValue} max={DISPLAY_NAME_MAX_LENGTH} />
        </div>
      </div>

      {submitError ? (
        <p className={styles.fieldError} role="alert">
          {submitError}
        </p>
      ) : null}

      <Button
        type="submit"
        className={styles.linkButton}
        loading={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? t("actions.joiningSpace") : t("actions.startStory")}
      </Button>
    </form>
  );
}
