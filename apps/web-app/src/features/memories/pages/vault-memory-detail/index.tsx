"use client";

import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { MemoryComments } from "../../components/memory-comments";
import { MemoryDetailView, type MemoryDetailViewProps } from "../../components/memory-detail-view";
import { MemoryEditLink } from "../../components/memory-edit-link";
import { MemoryPlacementAction } from "../../components/memory-placement-action";
import { MemoryReactions } from "../../components/memory-reactions";

type VaultMemoryDetailPageProps = Pick<
  MemoryDetailViewProps,
  "actions" | "comments" | "memory" | "reactions" | "relatedMemories"
>;

export function VaultMemoryDetailPage(props: Readonly<VaultMemoryDetailPageProps>) {
  const { t } = useTranslation("memories");
  return (
    <MemoryDetailView
      {...props}
      actions={
        props.actions ?? (
          <>
            <MemoryPlacementAction
              memoryId={props.memory.id}
              version={props.memory.version}
              visibility={props.memory.visibility}
            />
            <MemoryEditLink memoryId={props.memory.id} />
          </>
        )
      }
      backHref={APP_ROUTES.VAULT}
      backLabel={t("vault.detail.actions.backToVault")}
      comments={props.comments ?? <MemoryComments memoryId={props.memory.id} />}
      reactions={
        props.reactions ?? (
          <MemoryReactions memoryId={props.memory.id} reaction={props.memory.reaction} />
        )
      }
      relatedEmpty={t("vault.detail.related.empty")}
      relatedDestination="vault"
      relatedEyebrow={t("vault.detail.related.eyebrow")}
      relatedHeading={t("vault.detail.related.heading")}
    />
  );
}
