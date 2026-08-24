"use client";

import { BookHeart, Heart, ImageIcon, MapPin } from "lucide-react";
import { useState } from "react";
import type { TimelineMemory } from "../../types/timeline";
import styles from "./memory-summary-card.module.css";

type MemorySummaryCardProps = {
  memory: TimelineMemory;
  variant?: "recent" | "timeline";
};

function formatCompactDate(memoryDate: string): string {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(
    new Date(`${memoryDate}T00:00:00`),
  );
}

export function MemorySummaryCard({
  memory,
  variant = "timeline",
}: Readonly<MemorySummaryCardProps>) {
  const [hasCoverLoadFailed, setHasCoverLoadFailed] = useState(false);
  const coverPhotoUrl = hasCoverLoadFailed ? null : memory.coverPhotoUrl;

  return (
    <article className={`${styles.card} ${styles[variant]}`}>
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
        <div className={styles.meta}>
          <span className={styles.iconBadge}>
            <BookHeart aria-hidden="true" />
          </span>
          <p className={styles.date}>{formatCompactDate(memory.memoryDate)}</p>
        </div>
        <h3>{memory.title}</h3>
        {memory.description ? <p className={styles.description}>{memory.description}</p> : null}
        {memory.location ? (
          <p className={styles.location}>
            <MapPin aria-hidden="true" /> {memory.location}
          </p>
        ) : null}
        {variant === "timeline" ? <Heart className={styles.favorite} aria-hidden="true" /> : null}
        <div className={styles.extensions} data-extension-region="memory-count" />
        <div className={styles.extensions} data-extension-region="memory-detail-link" />
        <div className={styles.extensions} data-extension-region="memory-actions" />
      </div>
    </article>
  );
}
