"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MemoriesTimeline } from "../../components/memories-timeline";
import { MemorySortSelect } from "../../components/memory-sort-select";
import { DEFAULT_MEMORY_SORT, type MemorySort } from "../../constants/memory-sort";
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
  const [sort, setSort] = useState<MemorySort>(DEFAULT_MEMORY_SORT);

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
        <MemorySortSelect
          label={t("timeline.sort")}
          newestLabel={t("timeline.newest")}
          oldestLabel={t("timeline.oldest")}
          onChange={setSort}
          value={sort}
        />
      </motion.div>
      <motion.div variants={activeRevealVariants}>
        <MemoriesTimeline sort={sort} />
      </motion.div>
    </motion.main>
  );
}
