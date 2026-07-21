"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LeonlyLogo } from "@/components/leonly-logo";
import { useLoginWithGoogle } from "../../api/login-with-google";
import {
  brandVariants,
  pageVariants,
  panelVariants,
  reducedMotionVariants,
  revealVariants,
  staggerDelays,
} from "./constants";
import { MemoryCardStage } from "./memory-card-stage";
import { SignInCopy } from "./sign-in-copy";

export function SignInPage() {
  const { t } = useTranslation("auth");
  const loginWithGoogleMutation = useLoginWithGoogle();
  const shouldReduceMotion = useReducedMotion();
  const shouldUseReducedMotion = Boolean(shouldReduceMotion);
  const entranceVariants = shouldUseReducedMotion ? reducedMotionVariants : revealVariants;

  return (
    <motion.main
      variants={shouldUseReducedMotion ? reducedMotionVariants : pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-auth-canvas px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
    >
      <motion.section
        variants={shouldUseReducedMotion ? reducedMotionVariants : panelVariants}
        className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[78rem] overflow-hidden rounded-[1.45rem] border border-auth-border bg-auth-surface shadow-auth md:min-h-[calc(100vh-3rem)] md:rounded-[1.75rem]"
      >
        <div className="grid w-full gap-8 px-5 py-8 min-[360px]:px-6 sm:p-10 lg:grid-cols-[1fr_1.03fr] lg:gap-6 lg:px-14 lg:py-12 xl:px-16">
          <div className="flex flex-col justify-center">
            <LanguageSwitcher />

            <motion.div
              variants={shouldUseReducedMotion ? reducedMotionVariants : brandVariants}
              custom={staggerDelays.brand}
              className="mb-8 text-center lg:mb-10 lg:text-left"
            >
              <LeonlyLogo label={t("brand")} />
            </motion.div>

            <SignInCopy
              entranceVariants={entranceVariants}
              isLoginPending={loginWithGoogleMutation.isPending}
              onLogin={() => loginWithGoogleMutation.mutate()}
              shouldReduceMotion={shouldUseReducedMotion}
              t={t}
            />
          </div>

          <MemoryCardStage
            entranceVariants={entranceVariants}
            shouldReduceMotion={shouldUseReducedMotion}
            t={t}
          />
        </div>
      </motion.section>
    </motion.main>
  );
}
