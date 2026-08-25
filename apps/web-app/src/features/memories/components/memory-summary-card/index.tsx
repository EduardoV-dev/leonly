"use client";

import { BookHeart, Heart, ImageIcon, MapPin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { APP_ROUTES } from "@/constants/routes";
import type { TimelineMemory } from "../../types/timeline";
import styles from "./memory-summary-card.module.css";

type MemorySummaryCardProps = {
  actions?: ReactNode;
  count?: ReactNode;
  memory: TimelineMemory;
  variant?: "recent" | "timeline";
};

function formatCompactDate(memoryDate: string): string {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(
    new Date(`${memoryDate}T00:00:00`),
  );
}

export function MemorySummaryCard({
  actions,
  count,
  memory,
  variant = "timeline",
}: Readonly<MemorySummaryCardProps>) {
  const [hasCoverLoadFailed, setHasCoverLoadFailed] = useState(false);
  const coverPhotoUrl = hasCoverLoadFailed ? null : memory.coverPhotoUrl;

  return (
    <article className={`${styles.card} ${styles[variant]}`}>
      <Link
        className={styles.summaryLink}
        href={APP_ROUTES.MEMORY_DETAIL(memory.id)}
        aria-label={`Open ${memory.title}`}
      >
        <div className={styles.cover}>
          {coverPhotoUrl ? (
            // biome-ignore lint/performance/noImgElement: Timeline cover URLs are authorized runtime URLs.
            <img
              src={coverPhotoUrl}
              width={960}
              height={600}
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
        </div>
      </Link>
      <div className={styles.extensions} data-extension-region="memory-count">
        {count}
      </div>
      <div className={styles.extensions} data-extension-region="memory-actions">
        {actions}
      </div>
    </article>
  );
}
