"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, ArchiveX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { APP_ROUTES } from "@/constants/routes";
import { memoryQueryKeys } from "../../constants/query-keys";
import type { MemoryPlacementTarget } from "../../types/memory-placement";
import styles from "./memory-placement-action.module.css";

type MemoryPlacementActionProps = {
  disabled?: boolean;
  memoryId: string;
  version: string;
  visibility: "timeline" | "vault";
};

type PlacementResponse = {
  code?: "conflict" | "unavailable";
  error?: string;
  visibility?: MemoryPlacementTarget;
};

function targetFor(visibility: "timeline" | "vault"): MemoryPlacementTarget {
  return visibility === "timeline" ? "vault" : "timeline";
}

export function MemoryPlacementAction({
  disabled = false,
  memoryId,
  version,
  visibility,
}: Readonly<MemoryPlacementActionProps>) {
  const { t } = useTranslation("memories");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const target = targetFor(visibility);
  const label = t(
    target === "vault" ? "detail.actions.moveToVault" : "detail.actions.moveToTimeline",
  );

  const place = async () => {
    if (disabled || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/memories/${memoryId}/placement`, {
        body: JSON.stringify({ expectedVersion: version, targetVisibility: target }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json()) as PlacementResponse;
      if (payload.code === "conflict" || payload.code === "unavailable") {
        if (payload.code === "conflict") {
          toast.error(t("detail.placement.conflict"));
        }
        router.refresh();
        return;
      }
      if (!response.ok || payload.visibility !== target) {
        throw new Error(payload.error ?? t("detail.placement.failed"));
      }

      await queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all });
      toast.success(
        t(
          target === "vault" ? "detail.placement.successVault" : "detail.placement.successTimeline",
        ),
      );
      router.push(
        target === "vault"
          ? APP_ROUTES.VAULT_MEMORY_DETAIL(memoryId)
          : APP_ROUTES.MEMORY_DETAIL(memoryId),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("detail.placement.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      className={styles.button}
      disabled={disabled || isSubmitting}
      onClick={place}
      type="button"
    >
      {target === "vault" ? <ArchiveX aria-hidden="true" /> : <ArchiveRestore aria-hidden="true" />}
      {isSubmitting ? t("detail.placement.moving") : label}
    </button>
  );
}
