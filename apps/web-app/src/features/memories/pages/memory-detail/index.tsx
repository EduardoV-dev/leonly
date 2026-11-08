"use client";

import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { MemoryComments } from "../../components/memory-comments";
import { MemoryDetailView, type MemoryDetailViewProps } from "../../components/memory-detail-view";
import { MemoryReactions } from "../../components/memory-reactions";

type MemoryDetailPageProps = Pick<MemoryDetailViewProps, "memory" | "relatedMemories">;

export function MemoryDetailPage(props: Readonly<MemoryDetailPageProps>) {
  const { t } = useTranslation("memories");
  return (
    <MemoryDetailView
      {...props}
      comments={<MemoryComments memoryId={props.memory.id} />}
      reactions={<MemoryReactions memoryId={props.memory.id} reaction={props.memory.reaction} />}
      backHref={APP_ROUTES.TIMELINE}
      backLabel={t("detail.actions.backToTimeline")}
      relatedEmpty={t("detail.related.empty")}
      relatedEyebrow={t("detail.related.eyebrow")}
      relatedHeading={t("detail.related.heading")}
    />
  );
}
