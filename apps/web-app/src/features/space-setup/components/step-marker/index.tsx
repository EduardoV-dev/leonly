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
    <div className={styles.stepMarker}>
      <span>{label}</span>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={label}
        aria-valuemax={total}
        aria-valuemin={1}
        aria-valuenow={step}
      >
        <div className={styles.progressValue} style={{ transform: `scaleX(${step / total})` }} />
      </div>
    </div>
  );
}
