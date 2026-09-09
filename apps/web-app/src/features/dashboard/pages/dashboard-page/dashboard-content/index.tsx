"use client";

import { Heart, ImagePlus, LayoutGrid } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/page-header";
import { APP_ROUTES } from "@/constants/routes";
import { MemoriesTimeline } from "@/features/memories/components/memories-timeline";
import { PartnerInviteStatus } from "@/features/partner-invite/components/partner-invite-status";
import { useDashboardActiveSpace } from "../dashboard-shell";
import styles from "./dashboard-content.module.css";
import { RelationshipMilestone } from "./relationship-milestone";

const pageVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.06,
      staggerChildren: 0.065,
    },
  },
};

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
  },
};

const heroVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.075 } },
};

const keepsakeVariants: Variants = {
  hidden: { clipPath: "inset(0 0 10% 0 round 1rem)", opacity: 0, rotate: -0.6, y: 18 },
  visible: {
    clipPath: "inset(0 0 0% 0 round 1rem)",
    opacity: 1,
    rotate: 0,
    y: 0,
    transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] },
  },
};

const companionVariants: Variants = {
  hidden: { opacity: 0, rotate: 0.5, y: 14 },
  visible: {
    opacity: 1,
    rotate: 0,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.16 } },
};

export function DashboardContent() {
  const { t } = useTranslation("dashboard");
  const activeSpace = useDashboardActiveSpace();
  const shouldReduceMotion = Boolean(useReducedMotion());
  const isWaitingForPartner = activeSpace.active_members.length === 1;
  const activeRevealVariants = shouldReduceMotion ? reducedMotionVariants : revealVariants;
  const activeKeepsakeVariants = shouldReduceMotion ? reducedMotionVariants : keepsakeVariants;
  const activeCompanionVariants = shouldReduceMotion ? reducedMotionVariants : companionVariants;

  return (
    <motion.section
      className={styles.content}
      id="timeline"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={activeRevealVariants}>
        <PageHeader
          description={t(
            isWaitingForPartner
              ? "content.waitingWelcomeDescription"
              : "content.welcomeDescription",
          )}
          leading={<LayoutGrid aria-hidden="true" />}
          title={t(isWaitingForPartner ? "content.waitingHeading" : "content.heading")}
        />
      </motion.div>

      {isWaitingForPartner ? (
        <motion.div className={styles.inviteSection} variants={activeRevealVariants}>
          <PartnerInviteStatus
            code={activeSpace.invite_code}
            expiresAt={activeSpace.invite_code_expires_at}
            membershipState="one-member"
          />
        </motion.div>
      ) : null}

      {isWaitingForPartner ? null : (
        <motion.div className={styles.heroGrid} variants={heroVariants}>
          <motion.section
            className={styles.milestoneCard}
            aria-label={t("content.milestone")}
            variants={activeKeepsakeVariants}
          >
            <span className={styles.eyebrow}>
              <Heart aria-hidden="true" /> {t("content.milestoneReached")}
            </span>
            <RelationshipMilestone startDate={activeSpace.start_date} />
          </motion.section>
          <motion.section
            className={styles.storyPrompt}
            aria-label={t("content.createMemory")}
            variants={activeCompanionVariants}
          >
            <h2>{t("content.storyPromptHeading")}</h2>
            <p>{t("content.storyPromptDescription")}</p>
            <Link href={APP_ROUTES.MEMORIES_NEW}>
              <ImagePlus aria-hidden="true" />
              {t("content.createMemory")}
            </Link>
          </motion.section>
        </motion.div>
      )}

      <motion.section
        className={styles.summarySection}
        id="gallery"
        variants={activeRevealVariants}
      >
        <h2>{t("content.recentMemories")}</h2>
        <MemoriesTimeline variant="recent" />
      </motion.section>
    </motion.section>
  );
}
