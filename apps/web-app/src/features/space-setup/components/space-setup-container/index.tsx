"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { LeonlyLogo } from "@/components/leonly-logo";
import { AnimatePresence, type Variants, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { SpaceSetupSteps } from "../../types/setup-types";
import { screenImages } from "./constants";
import styles from "./space-setup.module.css";

const storyPanelVariants: Variants = {
  enter: {
    opacity: 0,
    x: -34,
    scale: 1.01,
  },
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    x: 34,
    scale: 1.01,
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  },
};

const contentPanelVariants: Variants = {
  enter: {
    opacity: 0,
    x: 34,
  },
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    x: -34,
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  },
};

const reducedMotionVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

type SpaceSetupContainerProps = {
  children: ReactNode;
  screen: SpaceSetupSteps;
};

export function SpaceSetupContainer({ children, screen }: SpaceSetupContainerProps) {
  const { t } = useTranslation("spaceSetup");
  const content = screenImages[screen];
  const shouldReduceMotion = useReducedMotion();
  const activeStoryPanelVariants = shouldReduceMotion ? reducedMotionVariants : storyPanelVariants;
  const activeContentPanelVariants = shouldReduceMotion
    ? reducedMotionVariants
    : contentPanelVariants;

  return (
    <main className="min-h-screen bg-auth-canvas px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className={styles.shell}>
        <aside className={styles.storyPanel} aria-label={t("aria.storyPanel")}>
          <div className={styles.brandStack}>
            <LeonlyLogo className={styles.brand} />
            <LanguageSwitcher className={styles.languageSwitcher} />
          </div>
          <AnimatePresence mode="wait" propagate>
            <motion.div
              key={screen}
              className={styles.storyMotion}
              variants={activeStoryPanelVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <img
                src={content.image}
                alt={t(`story.${screen}.imageAlt`)}
                className={styles.storyImage}
              />
              <div className={styles.storyShade} />
              <div className={styles.storyCaption}>
                <p>{t(`story.${screen}.caption`)}</p>
                <span>{t(`story.${screen}.captionDetail`)}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </aside>

        <section className={styles.contentPanel} aria-label={t("aria.contentPanel")}>
          <AnimatePresence mode="wait" propagate>
            <motion.div
              key={screen}
              className={styles.contentInner}
              variants={activeContentPanelVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </section>
      </section>
    </main>
  );
}
