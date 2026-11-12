"use client";

import { PencilLine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MemoryDeleteAction } from "../memory-delete-action";
import { MemoryPlacementAction } from "../memory-placement-action";
import styles from "./memory-detail-actions.module.css";

type MemoryDetailActionsProps = {
  memoryId: string;
  version: string;
  visibility: "timeline" | "vault";
};

export function MemoryDetailActions({
  memoryId,
  version,
  visibility,
}: Readonly<MemoryDetailActionsProps>) {
  const { t } = useTranslation("memories");
  const [isDeleting, setIsDeleting] = useState(false);
  const editHref =
    visibility === "vault" ? `/vault/${memoryId}/edit` : `/memories/${memoryId}/edit`;

  return (
    <div className={styles.actions}>
      <div className={styles.iconActions}>
        <Link
          aria-disabled={isDeleting}
          className={styles.editLink}
          href={editHref}
          tabIndex={isDeleting ? -1 : undefined}
          onClick={(event) => {
            if (isDeleting) event.preventDefault();
          }}
        >
          <PencilLine aria-hidden="true" />
          {t("detail.actions.edit")}
        </Link>
        <MemoryDeleteAction
          memoryId={memoryId}
          onPendingChange={setIsDeleting}
          visibility={visibility}
        />
      </div>
      <MemoryPlacementAction
        disabled={isDeleting}
        memoryId={memoryId}
        version={version}
        visibility={visibility}
      />
    </div>
  );
}
