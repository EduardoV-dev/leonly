import { APP_ROUTES } from "@/constants/routes";
import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BackLink } from "../../../components/back-link";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { StepMarker } from "../../../components/step-marker";

type CreateDateStepProps = {
  firstDay: string;
  onFirstDayChange: (value: string) => void;
};

export function CreateDateStep({ firstDay, onFirstDayChange }: CreateDateStepProps) {
  const { t } = useTranslation("spaceSetup");

  return (
    <div>
      <StepMarker step={2} total={3} />
      <h1 className={styles.heading}>{t("steps.date.heading")}</h1>
      <p className={styles.copy}>{t("steps.date.description")}</p>

      <div className={styles.dateCard}>
        <label className={styles.label} htmlFor="first-day">
          {t("steps.date.firstDayLabel")}
        </label>
        <div className={styles.inputWithIcon}>
          <input
            id="first-day"
            type="date"
            value={firstDay}
            onChange={(event) => onFirstDayChange(event.target.value)}
            className={styles.input}
          />
          <CalendarDays className={styles.inputIcon} aria-hidden="true" />
        </div>

        <Link
          href={APP_ROUTES.WELCOME_CREATE_STEP("invite")}
          className={`${styles.linkButton} ${styles.primaryButton}`}
        >
          {t("actions.continue")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <BackLink href={APP_ROUTES.WELCOME_CREATE_STEP("name")} />
      </div>

      <p className={styles.note}>"{t("steps.date.note")}"</p>
    </div>
  );
}
