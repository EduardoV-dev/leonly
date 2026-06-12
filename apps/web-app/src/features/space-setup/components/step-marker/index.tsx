import { useTranslation } from "react-i18next";
import styles from "./step-marker.module.css";

type StepMarkerProps = {
  step: number;
  total: number;
};

export function StepMarker({ step, total }: StepMarkerProps) {
  const { t } = useTranslation("spaceSetup");
  const label = t("stepMarker.label", { step, total });

  return (
    <div className={styles.stepMarker} aria-label={label}>
      <span>{label}</span>
      <div className={styles.progressTrack}>
        <div className={styles.progressValue} style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}
