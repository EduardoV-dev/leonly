import { type AppLanguage, setLanguage } from "@/lib/i18n";
import { type Variants, motion } from "motion/react";
import { languageOptions, staggerDelays } from "../constants";

type LanguageSwitcherProps = {
  currentLanguage: AppLanguage;
  entranceVariants: Variants;
  t: (key: string) => string;
};

export function LanguageSwitcher({ currentLanguage, entranceVariants, t }: LanguageSwitcherProps) {
  return (
    <motion.div
      variants={entranceVariants}
      custom={staggerDelays.language}
      className="mb-6 flex justify-center lg:justify-end"
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
