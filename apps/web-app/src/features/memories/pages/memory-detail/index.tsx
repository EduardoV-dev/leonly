"use client";

import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { MemoryComments } from "../../components/memory-comments";
import { MemoryDetailActions } from "../../components/memory-detail-actions";
import { MemoryDetailView, type MemoryDetailViewProps } from "../../components/memory-detail-view";
import { MemoryReactions } from "../../components/memory-reactions";

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
          <MemoryDetailActions
            memoryId={props.memory.id}
            version={props.memory.version}
            visibility={props.memory.visibility}
          />
        )
      }
      backHref={APP_ROUTES.TIMELINE}
      backLabel={t("detail.actions.backToTimeline")}
      comments={props.comments ?? <MemoryComments memoryId={props.memory.id} />}
      reactions={
        props.reactions ?? (
          <MemoryReactions memoryId={props.memory.id} reaction={props.memory.reaction} />
        )
      }
      relatedEmpty={t("detail.related.empty")}
      relatedEyebrow={t("detail.related.eyebrow")}
      relatedHeading={t("detail.related.heading")}
    />
  );
}
