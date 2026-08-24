import { ArrowRight } from "lucide-react";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { PastDatePicker } from "@/components/past-date-picker";
import { Button as LoadingButton } from "@/components/ui/button";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { APP_ROUTES } from "@/constants/routes";
import { BackLink } from "../../../components/back-link";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { StepMarker } from "../../../components/step-marker";
import type { CreateSpaceSetupFormValues } from "../../../hooks/use-create-space-setup-form";

type CreateDateStepProps = {
  control: Control<CreateSpaceSetupFormValues>;
  isSubmitting: boolean;
  submitError?: string | null;
  onContinue: () => void;
};

export function CreateDateStep({
  control,
  isSubmitting,
  onContinue,
  submitError,
}: CreateDateStepProps) {
  const { t } = useTranslation("spaceSetup");
  const today = new Date();
  const currentYear = today.getFullYear();
  const firstDayErrorId = "first-day-error";
  const { field, fieldState } = useController({
    control,
    name: "firstDay",
  });
  const firstDayError = fieldState.error;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <StepMarker step={2} total={3} />
      <h1 className={styles.heading}>{t("steps.date.heading")}</h1>
      <p className={styles.copy}>{t("steps.date.description")}</p>

      <div className={styles.dateCard}>
        <FieldGroup>
          <Field className={styles.dateField}>
            <FieldLabel className={styles.label} htmlFor="first-day-trigger">
              {t("steps.date.firstDayLabel")}
            </FieldLabel>
            <FieldContent data-setup-field>
              <PastDatePicker
                describedBy={firstDayError ? firstDayErrorId : undefined}
                id="first-day-trigger"
                isInvalid={Boolean(firstDayError)}
                label={t("steps.date.firstDayLabel")}
                latestDate={today}
                onChange={field.onChange}
                placeholder={t("steps.date.firstDayLabel")}
                startMonth={new Date(currentYear - 20, 0)}
                value={field.value}
              />
              {firstDayError ? (
                <p id={firstDayErrorId} className={styles.fieldError} role="alert">
                  {firstDayError.message}
                </p>
              ) : null}
            </FieldContent>
          </Field>
        </FieldGroup>

        <LoadingButton
          type="submit"
          className={`${styles.linkButton} ${styles.primaryButton}`}
          loading={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? t("actions.creatingSpace") : t("actions.startStory")}
          {!isSubmitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
        </LoadingButton>
        {submitError ? (
          <p className={styles.fieldError} role="alert">
            {submitError}
          </p>
        ) : null}
        <BackLink href={APP_ROUTES.WELCOME_CREATE_STEP("name")} />
      </div>

      <p className={styles.note}>"{t("steps.date.note")}"</p>
    </form>
  );
}
