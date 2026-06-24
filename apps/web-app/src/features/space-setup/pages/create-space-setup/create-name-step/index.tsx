import { CharacterCount } from "@/components/character-count";
import { APP_ROUTES } from "@/constants/routes";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BackLink } from "../../../components/back-link";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { StepMarker } from "../../../components/step-marker";
import { SPACE_NAME_MAX_LENGTH } from "../../../constants/validation";

export function CreateNameStep() {
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
          placeholder={t("steps.name.spaceNamePlaceholder")}
          className={styles.input}
          defaultValue=""
        />
        <div className={styles.fieldMeta}>
          <span />
          <CharacterCount value="" max={SPACE_NAME_MAX_LENGTH} />
        </div>
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
