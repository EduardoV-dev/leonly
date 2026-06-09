"use client";

import { LeonlyLogo } from "@/components/leonly-logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowRight, HeartCrack, Images } from "lucide-react";
import { type Variants, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.34, ease: "easeOut" } },
};

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
  },
};

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(8px)" },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const digitVariants: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay, duration: 0.56, ease: [0.2, 0.9, 0.22, 1] },
  }),
};

const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

const errorDigits = [
  { id: "first-four", value: "4" },
  { id: "zero", value: "0" },
  { id: "second-four", value: "4" },
] as const;

export default function NotFoundPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { t } = useTranslation("notFound");
  const shouldReduceMotion = Boolean(useReducedMotion());
  const entranceVariants = shouldReduceMotion ? reducedMotionVariants : revealVariants;

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const actionHref = isAuthenticated ? "/" : "/auth";
  const actionLabel = isAuthenticated ? t("actions.authenticated") : t("actions.unauthenticated");

  useEffect(() => {
    let isMounted = true;

    async function loadAuthState() {
      try {
        const { data } = await supabase.auth.getClaims();

        if (isMounted) {
          setIsAuthenticated(Boolean(data?.claims));
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
    }

    void loadAuthState();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  return (
    <motion.main
      variants={shouldReduceMotion ? reducedMotionVariants : pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-auth-canvas px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
    >
      <motion.section
        variants={shouldReduceMotion ? reducedMotionVariants : panelVariants}
        className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[78rem] overflow-hidden rounded-[1.45rem] border border-auth-border bg-auth-surface shadow-auth md:min-h-[calc(100vh-3rem)] md:rounded-[1.75rem] lg:grid-cols-[0.92fr_1fr]"
      >
        <motion.aside
          variants={entranceVariants}
          custom={0.12}
          className="relative min-h-[18rem] overflow-hidden border-b border-auth-border bg-auth-surface sm:min-h-[22rem] lg:min-h-full lg:border-b-0 lg:border-r"
          aria-hidden="true"
        >
          <motion.img
            src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=82"
            alt=""
            animate={shouldReduceMotion ? undefined : { scale: [1.02, 1.07, 1.02] }}
            transition={{
              duration: 13,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="h-full min-h-[18rem] w-full object-cover saturate-[0.86] sm:min-h-[22rem] lg:min-h-full"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(245_239_238_/_0.68)_0%,rgb(245_239_238_/_0.08)_38%,rgb(31_32_38_/_0.72)_100%)]" />

          <motion.div
            animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
            transition={{
              duration: 6.6,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="absolute bottom-5 left-5 right-5 rounded-[1.25rem] border border-auth-border bg-auth-surface p-4 shadow-[0_18px_44px_rgb(17_15_15_/_0.2)] sm:bottom-7 sm:left-7 sm:right-7 sm:p-5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-auth-button-border/30 bg-auth-surface text-auth-brand">
                <Images className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-auth-legal">
                  {t("imageCard.eyebrow")}
                </p>
                <p className="mt-1 font-display text-[1.55rem] font-[600] leading-none text-auth-heading">
                  {t("imageCard.title")}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.aside>

        <div className="flex flex-col justify-center px-5 py-8 text-center min-[360px]:px-6 sm:p-10 lg:px-14 lg:py-12 lg:text-left xl:px-16">
          <motion.div variants={entranceVariants} custom={0.08}>
            <LeonlyLogo className="justify-center lg:justify-start" />
          </motion.div>

          <div className="mx-auto mt-9 w-full max-w-[34rem] lg:mx-0">
            <motion.p
              variants={entranceVariants}
              custom={0.16}
              className="inline-flex items-center gap-2 rounded-full border border-auth-button-border/35 bg-white/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-auth-legal shadow-sm"
            >
              <HeartCrack className="h-4 w-4 text-auth-brand" aria-hidden="true" />
              {t("badge")}
            </motion.p>

            <div
              className="mt-6 flex justify-center gap-1 font-display text-[4.8rem] font-[600] leading-none tracking-normal text-auth-heading min-[360px]:text-[5.6rem] sm:text-[7rem] lg:justify-start"
              aria-label={t("ariaLabel")}
            >
              {errorDigits.map((digit, index) => (
                <motion.span
                  key={digit.id}
                  variants={shouldReduceMotion ? reducedMotionVariants : digitVariants}
                  custom={0.22 + index * 0.07}
                  aria-hidden="true"
                  className="inline-block"
                >
                  {digit.value}
                </motion.span>
              ))}
            </div>

            <motion.h1
              variants={entranceVariants}
              custom={0.48}
              className="mt-2 font-display text-[2.15rem] font-[600] leading-[1] tracking-normal text-auth-heading sm:text-[3rem]"
            >
              {t("heading")}
            </motion.h1>

            <motion.p
              variants={entranceVariants}
              custom={0.56}
              className="mx-auto mt-5 max-w-[30rem] text-base font-medium leading-relaxed text-auth-copy sm:text-lg lg:mx-0"
            >
              {t("description")}
            </motion.p>

            <motion.div variants={entranceVariants} custom={0.64} className="mt-9">
              <Link
                href={actionHref}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-auth-button-border bg-auth-button px-5 text-base font-semibold text-auth-button-text shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 sm:w-auto sm:min-w-[13.5rem]"
              >
                {actionLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.section>
    </motion.main>
  );
}
