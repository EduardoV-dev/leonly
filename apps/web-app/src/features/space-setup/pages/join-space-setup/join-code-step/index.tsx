import { APP_ROUTES } from "@/constants/routes";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SetupTabs } from "../../../components/setup-tabs";
import { INVITE_CODE } from "../../../components/space-setup-container/constants";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";

type JoinCodeStepProps = {
  inviteCode: string;
  onInviteCodeChange: (value: string) => void;
};

export function JoinCodeStep({ inviteCode, onInviteCodeChange }: JoinCodeStepProps) {
  const { t } = useTranslation("spaceSetup");

  return (
    <div>
      <SetupTabs activeTab="join" />

      <h1 className={styles.heading}>{t("steps.join.heading")}</h1>
      <p className={styles.copy}>{t("steps.join.description")}</p>

      <div className={styles.dateCard}>
        <label className={styles.label} htmlFor="invite-code">
          {t("steps.join.inviteCodeLabel")}
        </label>
        <input
          id="invite-code"
          type="text"
          value={inviteCode}
          onChange={(event) => onInviteCodeChange(event.target.value)}
          placeholder={INVITE_CODE}
          className={styles.input}
        />
        <Link href={APP_ROUTES.WELCOME_JOIN_STEP("name")} className={styles.linkButton}>
          {t("actions.joinSpace")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
