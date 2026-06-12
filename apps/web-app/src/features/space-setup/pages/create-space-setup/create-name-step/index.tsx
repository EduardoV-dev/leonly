import { APP_ROUTES } from "@/constants/routes";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BackLink } from "../../../components/back-link";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { StepMarker } from "../../../components/step-marker";

type CreateNameStepProps = {
  spaceName: string;
  onSpaceNameChange: (value: string) => void;
};

export function CreateNameStep({ spaceName, onSpaceNameChange }: CreateNameStepProps) {
  const { t } = useTranslation("spaceSetup");

  return (
    <div>
      <StepMarker step={1} total={3} />
      <h1 className={styles.heading}>{t("steps.name.heading")}</h1>
      <p className={styles.copy}>{t("steps.name.description")}</p>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="space-name">
          {t("steps.name.spaceNameLabel")}
        </label>
        <input
          id="space-name"
          type="text"
          value={spaceName}
          onChange={(event) => onSpaceNameChange(event.target.value)}
          placeholder={t("steps.name.spaceNamePlaceholder")}
          className={styles.input}
        />
      </div>

      <Link
        href={APP_ROUTES.WELCOME_CREATE_STEP("date")}
        className={`${styles.linkButton} ${styles.primaryButton}`}
      >
        {t("actions.continue")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <BackLink href={APP_ROUTES.WELCOME} />
    </div>
  );
}
