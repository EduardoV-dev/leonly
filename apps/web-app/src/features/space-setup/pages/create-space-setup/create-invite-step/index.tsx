import { APP_ROUTES } from "@/constants/routes";
import { Check, Copy, KeyRound } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BackLink } from "../../../components/back-link";
import { INVITE_CODE } from "../../../components/space-setup-container/constants";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { StepMarker } from "../../../components/step-marker";

type CreateInviteStepProps = {
  copied: boolean;
  onCopy: () => void;
};

export function CreateInviteStep({ copied, onCopy }: CreateInviteStepProps) {
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
          <strong>{INVITE_CODE}</strong>
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

      <Link href={APP_ROUTES.HOME} className={styles.linkButton}>
        {t("actions.startStory")}
      </Link>
      <BackLink href={APP_ROUTES.WELCOME_CREATE_STEP("date")} />
    </div>
  );
}
