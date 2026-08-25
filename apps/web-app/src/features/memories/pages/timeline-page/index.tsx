"use client";

import { ChevronDown, Heart } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
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
        <h1 className={styles.eyebrow}>Our Timeline</h1>
        <p className={styles.description}>
          A curated collection of our shared moments, carefully preserved.
        </p>
      </motion.header>
      <motion.div className={styles.toolbar} variants={activeRevealVariants}>
        <fieldset className={styles.filters} aria-label="Memory filters">
          <button type="button" aria-pressed="true">
            All
          </button>
          <button type="button" disabled title="Trips filter coming soon">
            Trips
          </button>
          <button type="button" disabled title="Anniversaries filter coming soon">
            Anniversaries
          </button>
          <button type="button" disabled title="Daily Life filter coming soon">
            Daily Life
          </button>
          <button type="button" disabled title="Favorites filter coming soon">
            <Heart aria-hidden="true" /> Favorites
          </button>
        </fieldset>
        <p className={styles.sort}>
          <span>Sort by:</span>
          <strong>Newest First</strong>
          <ChevronDown aria-hidden="true" />
        </p>
      </motion.div>
      <motion.div variants={activeRevealVariants}>
        <MemoriesTimeline />
      </motion.div>
    </motion.main>
  );
}
