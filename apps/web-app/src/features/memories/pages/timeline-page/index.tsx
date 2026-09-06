"use client";

import { ChevronDown, Heart } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { useTranslation } from "react-i18next";
import { MemoriesTimeline } from "../../components/memories-timeline";
import styles from "./timeline-page.module.css";

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delayChildren: 0.04, staggerChildren: 0.04 },
  },
};

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } },
};

const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

export function TimelinePage() {
  const { t } = useTranslation("dashboard");
  const shouldReduceMotion = Boolean(useReducedMotion());
  const activePageVariants = shouldReduceMotion ? reducedMotionVariants : pageVariants;
  const activeRevealVariants = shouldReduceMotion ? reducedMotionVariants : revealVariants;

  return (
    <motion.main
      className={styles.page}
      variants={activePageVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.header className={styles.header} variants={activeRevealVariants}>
        <h1 className={styles.eyebrow}>{t("timeline.heading")}</h1>
        <p className={styles.description}>{t("timeline.description")}</p>
      </motion.header>
      <motion.div className={styles.toolbar} variants={activeRevealVariants}>
        <fieldset className={styles.filters} aria-label={t("timeline.filters")}>
          <button type="button" aria-pressed="true">
            {t("timeline.all")}
          </button>
          <button
            type="button"
            disabled
            title={t("timeline.filterComingSoon", { filter: t("timeline.trips") })}
          >
            {t("timeline.trips")}
          </button>
          <button
            type="button"
            disabled
            title={t("timeline.filterComingSoon", { filter: t("timeline.anniversaries") })}
          >
            {t("timeline.anniversaries")}
          </button>
          <button
            type="button"
            disabled
            title={t("timeline.filterComingSoon", { filter: t("timeline.dailyLife") })}
          >
            {t("timeline.dailyLife")}
          </button>
          <button
            type="button"
            disabled
            title={t("timeline.filterComingSoon", { filter: t("timeline.favorites") })}
          >
            <Heart aria-hidden="true" /> {t("timeline.favorites")}
          </button>
        </fieldset>
        <p className={styles.sort}>
          <span>{t("timeline.sort")}</span>
          <strong>{t("timeline.newest")}</strong>
          <ChevronDown aria-hidden="true" />
        </p>
      </motion.div>
      <motion.div variants={activeRevealVariants}>
        <MemoriesTimeline />
      </motion.div>
    </motion.main>
  );
}
