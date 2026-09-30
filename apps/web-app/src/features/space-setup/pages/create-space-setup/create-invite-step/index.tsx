import { Check, Copy, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { StepMarker } from "../../../components/step-marker";

type CreateInviteStepProps = Readonly<{
  copied: boolean;
  isCompleting: boolean;
  inviteCode: string | null;
  onCopy: () => void;
  onContinue: () => void;
  submitError: string | null;
}>;

export function CreateInviteStep({
  copied,
  isCompleting,
  inviteCode,
  onContinue,
  onCopy,
  submitError,
}: CreateInviteStepProps) {
  const { t } = useTranslation("spaceSetup");

  return (
    <div>
      <StepMarker step={3} total={3} />
      <div className={styles.iconBadge}>
        <KeyRound className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 className={styles.heading}>{t("steps.invite.heading")}</h1>
      <p className={styles.copy}>{t("steps.invite.description")}</p>

      {inviteCode ? (
        <>
          <div className={styles.inviteCodeBox}>
            <div>
              <p className={styles.label}>{t("steps.invite.codeLabel")}</p>
              <strong>{inviteCode}</strong>
            </div>
            <button type="button" className={styles.copyButton} onClick={onCopy}>
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? t("actions.copied") : t("actions.copyCode")}
            </button>
          </div>
          <p className={styles.expiryNote}>{t("steps.invite.expiryNote")}</p>
        </>
      ) : (
        <p className={styles.fieldError} role="status">
          {t("errors.inviteUnavailable")}
        </p>
      )}

      {submitError ? (
        <p className={styles.fieldError} role="alert">
          {submitError}
        </p>
      ) : null}

      <Button
        type="button"
        className={styles.linkButton}
        loading={isCompleting}
        aria-busy={isCompleting}
        onClick={onContinue}
      >
        {isCompleting ? t("actions.completingSetup") : t("actions.continueToDashboard")}
      </Button>
    </div>
  );
}
