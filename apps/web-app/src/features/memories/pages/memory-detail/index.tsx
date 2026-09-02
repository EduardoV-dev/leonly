"use client";

import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { MemoryDetailView, type MemoryDetailViewProps } from "../../components/memory-detail-view";
import { MemoryEditLink } from "../../components/memory-edit-link";
import { MemoryPlacementAction } from "../../components/memory-placement-action";

type MemoryDetailPageProps = Pick<
  MemoryDetailViewProps,
  "actions" | "comments" | "memory" | "reactions" | "relatedMemories"
>;

export function MemoryDetailPage(props: Readonly<MemoryDetailPageProps>) {
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
      backHref={APP_ROUTES.TIMELINE}
      backLabel={t("detail.actions.backToTimeline")}
      relatedEmpty={t("detail.related.empty")}
      relatedEyebrow={t("detail.related.eyebrow")}
      relatedHeading={t("detail.related.heading")}
    />
  );
}
