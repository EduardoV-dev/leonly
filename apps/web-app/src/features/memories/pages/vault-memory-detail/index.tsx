"use client";

import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { MemoryDetailView, type MemoryDetailViewProps } from "../../components/memory-detail-view";
import { MemoryEditLink } from "../../components/memory-edit-link";

type VaultMemoryDetailPageProps = Pick<
  MemoryDetailViewProps,
  "actions" | "comments" | "memory" | "reactions" | "relatedMemories"
>;

export function VaultMemoryDetailPage(props: Readonly<VaultMemoryDetailPageProps>) {
  const { t } = useTranslation("memories");
  return (
    <MemoryDetailView
      {...props}
      actions={props.actions ?? <MemoryEditLink memoryId={props.memory.id} />}
      backHref={APP_ROUTES.VAULT}
      backLabel={t("vault.detail.actions.backToVault")}
      relatedEmpty={t("vault.detail.related.empty")}
      relatedDestination="vault"
      relatedEyebrow={t("vault.detail.related.eyebrow")}
      relatedHeading={t("vault.detail.related.heading")}
    />
  );
}
