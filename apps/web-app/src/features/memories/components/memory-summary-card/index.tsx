"use client";

import { ImageIcon, MapPin } from "lucide-react";
import { useState } from "react";
import type { TimelineMemory } from "../../types/timeline";
import styles from "./memory-summary-card.module.css";

type MemorySummaryCardProps = {
  memory: TimelineMemory;
};

function formatMemoryDate(memoryDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${memoryDate}T00:00:00`));
}

export function MemorySummaryCard({ memory }: Readonly<MemorySummaryCardProps>) {
  const [hasCoverLoadFailed, setHasCoverLoadFailed] = useState(false);
  const coverPhotoUrl = hasCoverLoadFailed ? null : memory.coverPhotoUrl;

  return (
    <article className={styles.card}>
      <div className={styles.cover}>
        {coverPhotoUrl ? (
          // biome-ignore lint/performance/noImgElement: Timeline cover URLs are authorized runtime URLs.
          <img
            src={coverPhotoUrl}
            alt={`Cover for ${memory.title}`}
            onError={() => setHasCoverLoadFailed(true)}
          />
        ) : (
          <span role="img" aria-label="No cover photo available">
            <ImageIcon aria-hidden="true" />
          </span>
        )}
      </div>
      <div className={styles.cardBody}>
        <p className={styles.date}>{formatMemoryDate(memory.memoryDate)}</p>
        <h3>{memory.title}</h3>
        {memory.description ? <p className={styles.description}>{memory.description}</p> : null}
        {memory.location ? (
          <p className={styles.location}>
            <MapPin aria-hidden="true" /> {memory.location}
          </p>
        ) : null}
        <div className={styles.extensions} data-extension-region="memory-count" />
        <div className={styles.extensions} data-extension-region="memory-detail-link" />
        <div className={styles.extensions} data-extension-region="memory-actions" />
      </div>
    </article>
  );
}
