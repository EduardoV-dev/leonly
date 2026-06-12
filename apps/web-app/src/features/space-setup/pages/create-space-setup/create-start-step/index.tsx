import { APP_ROUTES } from "@/constants/routes";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SetupTabs } from "../../../components/setup-tabs";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";

type CreateStartStepProps = {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
};

export function CreateStartStep({ displayName, onDisplayNameChange }: CreateStartStepProps) {
  const { t } = useTranslation("spaceSetup");

  return (
    <div>
      <SetupTabs activeTab="create" />

      <h1 className={styles.heading}>{t("steps.start.heading")}</h1>
      <p className={styles.copy}>{t("steps.start.description")}</p>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="display-name">
          {t("steps.start.displayNameLabel")}
          <span className={styles.optional}>{t("steps.start.optional")}</span>
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder={t("steps.start.displayNamePlaceholder")}
          className={styles.input}
        />
      </div>

      <Link href={APP_ROUTES.WELCOME_CREATE_STEP("name")} className={styles.linkButton}>
        {t("actions.continue")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
