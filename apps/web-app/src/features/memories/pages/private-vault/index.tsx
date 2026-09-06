"use client";

import { LockKeyhole, UsersRound } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MemorySortSelect } from "../../components/memory-sort-select";
import { VaultMemories } from "../../components/vault-memories";
import { DEFAULT_MEMORY_SORT, type MemorySort } from "../../constants/memory-sort";
import styles from "./private-vault.module.css";

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.04, staggerChildren: 0.06 } },
};

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } },
};

const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

export function PrivateVaultPage() {
  const { t } = useTranslation("memories");
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
      <motion.header className={styles.hero} variants={activeRevealVariants}>
        <span className={styles.seal} aria-hidden="true">
          <LockKeyhole />
        </span>
        <div className={styles.introduction}>
          <p className={styles.eyebrow}>{t("vault.hero.eyebrow")}</p>
          <h1>{t("vault.hero.heading")}</h1>
          <p className={styles.description}>{t("vault.hero.description")}</p>
        </div>
        <p className={styles.sharedNote}>
          <UsersRound aria-hidden="true" />
          {t("vault.hero.shared")}
        </p>
      </motion.header>
      <motion.div className={styles.sort} variants={activeRevealVariants}>
        <MemorySortSelect
          label={t("vault.sort.label")}
          newestLabel={t("vault.sort.newest")}
          oldestLabel={t("vault.sort.oldest")}
          onChange={setSort}
          value={sort}
        />
      </motion.div>
      <motion.div variants={activeRevealVariants}>
        <VaultMemories sort={sort} />
      </motion.div>
    </motion.main>
  );
}
