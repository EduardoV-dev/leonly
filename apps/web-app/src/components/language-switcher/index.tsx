"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { useTranslation } from "react-i18next";
import { type AppLanguage, normalizeLanguage, setLanguage } from "@/lib/i18n";
import { cn } from "@/utils/merge-class-names";

const languageRevealEase = [0.22, 1, 0.36, 1] as const;
const languageDelay = 0.07;

const languageRevealVariants: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(8px)" },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay, duration: 0.52, ease: languageRevealEase },
  }),
};

const languageReducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

const languageOptions: Array<{
  code: AppLanguage;
  flag: string;
  labelKey: "language.english" | "language.spanish";
  shortLabel: "EN" | "ES";
}> = [
  { code: "en", flag: "\u{1F1FA}\u{1F1F8}", labelKey: "language.english", shortLabel: "EN" },
  { code: "es", flag: "\u{1F1F3}\u{1F1EE}", labelKey: "language.spanish", shortLabel: "ES" },
];

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation("auth");
  const shouldReduceMotion = useReducedMotion();
  const currentLanguage = normalizeLanguage(i18n.language);
  const entranceVariants = shouldReduceMotion
    ? languageReducedMotionVariants
    : languageRevealVariants;

  return (
    <motion.div
      variants={entranceVariants}
      custom={languageDelay}
      className={cn("mb-6 flex justify-center lg:justify-end", className)}
    >
      <div className="inline-flex rounded-full border border-auth-button-border/60 bg-white/65 p-1 shadow-sm backdrop-blur">
        {languageOptions.map((option) => {
          const isActive = currentLanguage === option.code;

          return (
            <button
              key={option.code}
              type="button"
              onClick={() => setLanguage(option.code)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors sm:px-4 sm:text-sm ${
                isActive
                  ? "bg-auth-button text-auth-button-text"
                  : "text-auth-brand hover:bg-auth-brand/10"
              }`}
              aria-label={t(option.labelKey)}
            >
              <span aria-hidden="true">{option.flag}</span>
              <span>{option.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
