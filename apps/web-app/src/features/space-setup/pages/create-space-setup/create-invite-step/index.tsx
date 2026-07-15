import { Check, Copy, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { StepMarker } from "../../../components/step-marker";

type CreateInviteStepProps = {
  copied: boolean;
  inviteCode: string;
  onCopy: () => void;
  onContinue: () => void;
  spaceName: string;
};

export function CreateInviteStep({
  copied,
  inviteCode,
  onContinue,
  onCopy,
  spaceName,
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

      <div className={styles.inviteCodeBox}>
        <div>
          <p className={styles.label}>{t("steps.invite.codeLabel")}</p>
          <strong>{inviteCode}</strong>
          <p className={styles.note}>{spaceName}</p>
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

      <button type="button" className={styles.linkButton} onClick={onContinue}>
        {t("actions.continueToDashboard")}
      </button>
    </div>
  );
}
