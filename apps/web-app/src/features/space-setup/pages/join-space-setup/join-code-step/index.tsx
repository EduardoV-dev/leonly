import { ArrowRight } from "lucide-react";
import type { ChangeEvent } from "react";
import type { Control, FieldError } from "react-hook-form";
import { useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { SetupTabs } from "../../../components/setup-tabs";
import { INVITE_CODE } from "../../../components/space-setup-container/constants";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { formatInviteCodeInput } from "../../../constants/validation";
import type { JoinSpaceSetupFormValues } from "../../../hooks/use-join-space-setup-form";

type JoinCodeStepProps = {
  control: Control<JoinSpaceSetupFormValues>;
  inviteCodeError?: FieldError;
  isSubmitting: boolean;
  onContinue: () => void;
};

export function JoinCodeStep({
  control,
  inviteCodeError,
  isSubmitting,
  onContinue,
}: JoinCodeStepProps) {
  const { t } = useTranslation("spaceSetup");
  const inviteCodeErrorId = "invite-code-error";
  const { field } = useController({
    control,
    name: "inviteCode",
  });

  const handleInviteCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    field.onChange(formatInviteCodeInput(event.target.value));
  };

  return (
    <div>
      <SetupTabs activeTab="join" />

      <h1 className={styles.heading}>{t("steps.join.heading")}</h1>
      <p className={styles.copy}>{t("steps.join.description")}</p>

      <div className={styles.dateCard} data-setup-field>
        <label className={styles.label} htmlFor="invite-code">
          {t("steps.join.inviteCodeLabel")}
        </label>
        <input
          id="invite-code"
          type="text"
          placeholder={INVITE_CODE}
          className={styles.input}
          aria-describedby={inviteCodeError ? inviteCodeErrorId : undefined}
          aria-invalid={Boolean(inviteCodeError)}
          autoCapitalize="characters"
          {...field}
          onChange={handleInviteCodeChange}
          value={field.value ?? ""}
        />
        {inviteCodeError ? (
          <p id={inviteCodeErrorId} className={styles.fieldError}>
            {inviteCodeError.message}
          </p>
        ) : null}
        <button
          type="button"
          className={styles.linkButton}
          disabled={isSubmitting}
          onClick={onContinue}
        >
          {isSubmitting ? t("actions.validatingInviteCode") : t("actions.joinSpace")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
