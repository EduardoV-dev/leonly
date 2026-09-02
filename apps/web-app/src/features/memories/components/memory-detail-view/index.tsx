"use client";

import { ArrowLeft, CalendarDays, LockKeyhole, MapPin, UsersRound } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { MemoryDetail } from "../../types/memory-detail";
import type { TimelineMemory } from "../../types/timeline";
import { MemoryPhotoGallery } from "../memory-photo-gallery";
import { MemorySummaryCard } from "../memory-summary-card";
import styles from "./memory-detail-view.module.css";

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delayChildren: 0.04, staggerChildren: 0.05 },
  },
};

const layoutVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { delayChildren: 0.04, staggerChildren: 0.06 } },
};

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } },
};

const galleryVariants: Variants = {
  hidden: { opacity: 0, x: -16, y: 8 },
  visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

const storyVariants: Variants = {
  hidden: { opacity: 0, x: 16, y: 8 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.05,
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const relatedVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delayChildren: 0.04,
      staggerChildren: 0.05,
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

export type MemoryDetailViewProps = {
  actions?: ReactNode;
  backHref: string;
  backLabel: string;
  comments?: ReactNode;
  memory: MemoryDetail;
  relatedEmpty: string;
  relatedDestination?: "timeline" | "vault";
  relatedEyebrow: string;
  relatedHeading: string;
  relatedMemories?: TimelineMemory[];
  reactions?: ReactNode;
};

export function MemoryDetailView({
  actions,
  backHref,
  backLabel,
  comments,
  memory,
  relatedEmpty,
  relatedDestination = "timeline",
  relatedEyebrow,
  relatedHeading,
  relatedMemories = [],
  reactions,
}: Readonly<MemoryDetailViewProps>) {
  const { i18n, t } = useTranslation("memories");
  const shouldReduceMotion = Boolean(useReducedMotion());
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${memory.memoryDate}T00:00:00`));
  const isVaultMemory = memory.visibility === "vault";
  const activePageVariants = shouldReduceMotion ? reducedMotionVariants : pageVariants;
  const activeLayoutVariants = shouldReduceMotion ? reducedMotionVariants : layoutVariants;
  const activeRevealVariants = shouldReduceMotion ? reducedMotionVariants : revealVariants;
  const activeGalleryVariants = shouldReduceMotion ? reducedMotionVariants : galleryVariants;
  const activeStoryVariants = shouldReduceMotion ? reducedMotionVariants : storyVariants;
  const activeRelatedVariants = shouldReduceMotion ? reducedMotionVariants : relatedVariants;

  return (
    <motion.main
      className={styles.page}
      variants={activePageVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={activeRevealVariants}>
        <Link className={styles.backLink} href={backHref}>
          <ArrowLeft aria-hidden="true" />
          {backLabel}
        </Link>
      </motion.div>
      <motion.div className={styles.layout} variants={activeLayoutVariants}>
        <motion.div className={styles.spread} variants={activeLayoutVariants}>
          <motion.div variants={activeGalleryVariants}>
            <MemoryPhotoGallery
              dateLabel={formattedDate}
              dateTime={memory.memoryDate}
              description={memory.description}
              photos={memory.photos}
              title={memory.title}
            />
          </motion.div>

          <motion.article className={styles.story} variants={activeStoryVariants}>
            <motion.header className={styles.header} variants={activeRevealVariants}>
              <motion.div className={styles.metadata} variants={activeRevealVariants}>
                <p>
                  <CalendarDays aria-hidden="true" />
                  <time dateTime={memory.memoryDate}>{formattedDate}</time>
                </p>
                {memory.location ? (
                  <p>
                    <MapPin aria-hidden="true" />
                    {memory.location}
                  </p>
                ) : null}
              </motion.div>

              <motion.h1 id="memory-detail-title" variants={activeRevealVariants}>
                {memory.title}
              </motion.h1>

              <motion.p
                className={styles.visibility}
                data-visibility={memory.visibility}
                variants={activeRevealVariants}
              >
                {isVaultMemory ? (
                  <LockKeyhole aria-hidden="true" />
                ) : (
                  <UsersRound aria-hidden="true" />
                )}
                {t(`detail.visibility.${memory.visibility}`)}
              </motion.p>
            </motion.header>

            {memory.description ? (
              <motion.p className={styles.description} variants={activeRevealVariants}>
                {memory.description}
              </motion.p>
            ) : null}

            {reactions ? (
              <motion.section
                data-extension-region="memory-reactions"
                variants={activeRevealVariants}
              >
                {reactions}
              </motion.section>
            ) : null}
            {comments ? (
              <motion.section
                data-extension-region="memory-comments"
                variants={activeRevealVariants}
              >
                {comments}
              </motion.section>
            ) : null}

            <motion.footer
              className={styles.attribution}
              data-detail-footer="true"
              variants={activeRevealVariants}
            >
              {actions ? (
                <section data-extension-region="memory-actions" data-visibility={memory.visibility}>
                  {actions}
                </section>
              ) : null}
              <div className={styles.creator}>
                {memory.creatorAvatarUrl ? (
                  // biome-ignore lint/performance/noImgElement: Creator avatar URLs are authorized runtime URLs.
                  <img
                    className={styles.avatar}
                    src={memory.creatorAvatarUrl}
                    alt={memory.creatorDisplayName}
                  />
                ) : null}
                <p>{t("detail.creator", { name: memory.creatorDisplayName })}</p>
              </div>
            </motion.footer>
          </motion.article>
        </motion.div>

        <motion.section
          className={styles.related}
          aria-labelledby="related-memories-heading"
          variants={activeRelatedVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ amount: 0.15, once: true }}
        >
          <motion.header className={styles.relatedHeader} variants={activeRevealVariants}>
            <p>{relatedEyebrow}</p>
            <h2 id="related-memories-heading">{relatedHeading}</h2>
          </motion.header>
          {relatedMemories.length > 0 ? (
            <div className={styles.relatedGrid}>
              {relatedMemories.map((relatedMemory, index) => (
                <MemorySummaryCard
                  destination={relatedDestination}
                  key={relatedMemory.id}
                  entryIndex={index}
                  memory={relatedMemory}
                  variant="related"
                />
              ))}
            </div>
          ) : (
            <motion.p className={styles.relatedEmpty} variants={activeRevealVariants}>
              {relatedEmpty}
            </motion.p>
          )}
        </motion.section>
      </motion.div>
    </motion.main>
  );
}
