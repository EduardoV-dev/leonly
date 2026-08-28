"use client";

import { BookHeart, Heart, ImageIcon, LockKeyhole, MapPin } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { APP_ROUTES } from "@/constants/routes";
import type { TimelineMemory } from "../../types/timeline";
import styles from "./memory-summary-card.module.css";

type MemorySummaryCardProps = {
  actions?: ReactNode;
  count?: ReactNode;
  destination?: "timeline" | "vault";
  entryIndex?: number;
  memory: TimelineMemory;
  variant?: "recent" | "related" | "timeline" | "vault";
};

type CardMotion = {
  delay: number;
  x: number;
};

const cardVariants: Variants = {
  hidden: ({ x }: CardMotion) => ({ opacity: 0, x, y: 10 }),
  visible: ({ delay }: CardMotion) => ({
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      delay,
      delayChildren: 0.04,
      staggerChildren: 0.035,
      duration: 0.26,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const summaryVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { delayChildren: 0.02, staggerChildren: 0.04 } },
};

const coverVariants: Variants = {
  hidden: { opacity: 0, scale: 0.985 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
};

const bodyVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delayChildren: 0.03, staggerChildren: 0.03, duration: 0.2, ease: "easeOut" },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.16, ease: "easeOut" } },
};

const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

function formatCompactDate(memoryDate: string): string {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(
    new Date(`${memoryDate}T00:00:00`),
  );
}

export function MemorySummaryCard({
  actions,
  count,
  destination = "timeline",
  entryIndex = 0,
  memory,
  variant = "timeline",
}: Readonly<MemorySummaryCardProps>) {
  const [hasCoverLoadFailed, setHasCoverLoadFailed] = useState(false);
  const coverPhotoUrl = hasCoverLoadFailed ? null : memory.coverPhotoUrl;
  const shouldReduceMotion = Boolean(useReducedMotion());
  const activeCardVariants = shouldReduceMotion ? reducedMotionVariants : cardVariants;
  const activeSummaryVariants = shouldReduceMotion ? reducedMotionVariants : summaryVariants;
  const activeCoverVariants = shouldReduceMotion ? reducedMotionVariants : coverVariants;
  const activeBodyVariants = shouldReduceMotion ? reducedMotionVariants : bodyVariants;
  const activeContentVariants = shouldReduceMotion ? reducedMotionVariants : contentVariants;
  const detailHref =
    destination === "vault"
      ? APP_ROUTES.VAULT_MEMORY_DETAIL(memory.id)
      : APP_ROUTES.MEMORY_DETAIL(memory.id);
  const cardMotion: CardMotion = {
    delay: Math.min(entryIndex, 5) * 0.04,
    x: variant === "timeline" && entryIndex % 2 === 1 ? 18 : -18,
  };

  return (
    <motion.article
      className={`${styles.card} ${styles[variant]}`}
      variants={activeCardVariants}
      custom={cardMotion}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15, once: true }}
    >
      <motion.div variants={activeSummaryVariants}>
        <Link className={styles.summaryLink} href={detailHref} aria-label={`Open ${memory.title}`}>
          <motion.div className={styles.cover} variants={activeCoverVariants}>
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
          </motion.div>
          <motion.div className={styles.cardBody} variants={activeBodyVariants}>
            <motion.div className={styles.meta} variants={activeContentVariants}>
              <span className={styles.iconBadge}>
                {variant === "vault" ? (
                  <LockKeyhole aria-hidden="true" />
                ) : (
                  <BookHeart aria-hidden="true" />
                )}
              </span>
              <p className={styles.date}>{formatCompactDate(memory.memoryDate)}</p>
            </motion.div>
            <motion.h3 variants={activeContentVariants}>{memory.title}</motion.h3>
            {memory.description ? (
              <motion.p className={styles.description} variants={activeContentVariants}>
                {memory.description}
              </motion.p>
            ) : null}
            {memory.location ? (
              <motion.p className={styles.location} variants={activeContentVariants}>
                <MapPin aria-hidden="true" />
                <span>{memory.location}</span>
              </motion.p>
            ) : null}
            {variant === "timeline" ? (
              <motion.div variants={activeContentVariants}>
                <Heart className={styles.favorite} aria-hidden="true" />
              </motion.div>
            ) : null}
          </motion.div>
        </Link>
      </motion.div>
      <div className={styles.extensions} data-extension-region="memory-count">
        {count}
      </div>
      <div className={styles.extensions} data-extension-region="memory-actions">
        {actions}
      </div>
    </motion.article>
  );
}
