import { ArrowRight } from "lucide-react";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { CharacterCount } from "@/components/character-count";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/constants/routes";
import { BackLink } from "../../../components/back-link";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { StepMarker } from "../../../components/step-marker";
import { SPACE_NAME_MAX_LENGTH } from "../../../constants/validation";
import type { CreateSpaceSetupFormValues } from "../../../hooks/use-create-space-setup-form";

type CreateNameStepProps = {
  control: Control<CreateSpaceSetupFormValues>;
  isSubmitting: boolean;
  onContinue: () => void;
};

export function CreateNameStep({ control, isSubmitting, onContinue }: CreateNameStepProps) {
  const { t } = useTranslation("spaceSetup");
  const spaceNameErrorId = "space-name-error";
  const { field, fieldState } = useController({
    control,
    name: "spaceName",
  });
  const spaceNameError = fieldState.error;
  const spaceNameValue = field.value ?? "";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <StepMarker step={1} total={3} />
      <h1 className={styles.heading}>{t("steps.name.heading")}</h1>
      <p className={styles.copy}>{t("steps.name.description")}</p>

      <div className={styles.formGroup} data-setup-field>
        <label className={styles.label} htmlFor="space-name">
          {t("steps.name.spaceNameLabel")}
        </label>
        <input
          id="space-name"
          type="text"
          placeholder={t("steps.name.spaceNamePlaceholder")}
          className={styles.input}
          aria-describedby={spaceNameError ? spaceNameErrorId : undefined}
          aria-invalid={Boolean(spaceNameError)}
          {...field}
          value={spaceNameValue}
        />
        <div className={styles.fieldMeta}>
          {spaceNameError ? (
            <p id={spaceNameErrorId} className={styles.fieldError} role="alert">
              {spaceNameError.message}
            </p>
          ) : (
            <span />
          )}
          <CharacterCount value={spaceNameValue} max={SPACE_NAME_MAX_LENGTH} />
        </div>
      </div>

      <Button
        type="submit"
        className={`${styles.linkButton} ${styles.primaryButton}`}
        loading={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? t("actions.savingSpaceName") : t("actions.continue")}
        {!isSubmitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
      </Button>
      <BackLink href={APP_ROUTES.WELCOME_CREATE_STEP("start")} />
    </form>
  );
}
