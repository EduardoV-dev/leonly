"use client";

import { useState } from "react";
import { MemoryDeleteAction } from "../memory-delete-action";
import { MemoryEditLink } from "../memory-edit-link";
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
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className={styles.actions}>
      <div className={styles.iconActions}>
        <MemoryEditLink disabled={isDeleting} memoryId={memoryId} />
        <MemoryDeleteAction
          memoryId={memoryId}
          onPendingChange={setIsDeleting}
          version={version}
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
