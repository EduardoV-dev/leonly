"use client";

import { ArchiveRestore, ArchiveX } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./memory-placement-action.module.css";
import { useMemoryPlacement } from "./use-memory-placement";

type MemoryPlacementActionProps = {
  disabled?: boolean;
  memoryId: string;
  version: string;
  visibility: "timeline" | "vault";
};

export function MemoryPlacementAction({
  disabled = false,
  memoryId,
  version,
  visibility,
}: Readonly<MemoryPlacementActionProps>) {
  const { t } = useTranslation("memories");
  const placement = useMemoryPlacement({ memoryId, version, visibility });
  const label = t(
    placement.target === "vault" ? "detail.actions.moveToVault" : "detail.actions.moveToTimeline",
  );

  return (
    <div>
      <button
        className={styles.button}
        disabled={disabled || placement.isSubmitting || placement.needsRefresh}
        onClick={() => void placement.place()}
        type="button"
      >
        {placement.target === "vault" ? (
          <ArchiveX aria-hidden="true" />
        ) : (
          <ArchiveRestore aria-hidden="true" />
        )}
        {placement.isSubmitting ? t("detail.placement.moving") : label}
      </button>
      {placement.error ? <p role="alert">{placement.error}</p> : null}
      {placement.needsRefresh ? (
        <button
          type="button"
          disabled={placement.isSubmitting}
          onClick={() => void placement.refresh()}
        >
          {t("detail.placement.refresh")}
        </button>
      ) : null}
    </div>
  );
}
