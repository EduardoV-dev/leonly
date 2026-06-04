'use client';

import { Button } from '@/components/ui/button';
import { type AppLanguage, setLanguage } from '@/lib/i18n';
import { type Variants, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { FaHeart } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import { useLoginWithGoogle } from '../../api/login-with-google';
import styles from './sign-in.module.css';

const revealEase = [0.22, 1, 0.36, 1] as const;
const headingEase = [0.2, 0.9, 0.22, 1] as const;
const popEase = [0.18, 1.25, 0.4, 1] as const;
const cardEase = [0.18, 1.05, 0.3, 1] as const;

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.42, ease: 'easeOut' } },
};

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.62, ease: revealEase },
  },
};

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 10, filter: 'blur(8px)' },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay, duration: 0.52, ease: revealEase },
  }),
};

const brandVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay, duration: 0.56, ease: revealEase },
  }),
};

const headingVariants: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay, duration: 0.64, ease: headingEase },
  }),
};

const buttonVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay, duration: 0.58, ease: popEase },
  }),
};

const cardEntryVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.88, filter: 'blur(10px)' },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { delay, duration: 0.72, ease: cardEase },
  }),
};

const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

const staggerDelays = {
  language: 0.07,
  brand: 0.14,
  heading: 0.21,
  description: 0.28,
  button: 0.35,
  legal: 0.42,
  cardStage: 0.42,
  firstCard: 0.5,
  secondCard: 0.58,
  thirdCard: 0.66,
} as const;

const memoryCards = [
  {
    id: 'card-1',
    src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=800&q=80',
    altKey: 'cards.card1Alt',
    frameClassName: `${styles.cardFrame} ${styles.cardTop} w-[12.6rem] md:w-[13.4rem] lg:w-[16rem] xl:w-[17.2rem]`,
    entryDelay: staggerDelays.firstCard,
    floatY: -10,
    floatDuration: 7.4,
    floatDelay: 0,
  },
  {
    id: 'card-2',
    src: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80',
    altKey: 'cards.card2Alt',
    frameClassName: `${styles.cardFrame} ${styles.cardMiddle} w-[10.8rem] md:w-[12.2rem] lg:w-[13.6rem] xl:w-[14.4rem]`,
    entryDelay: staggerDelays.secondCard,
    floatY: 10,
    floatDuration: 6.8,
    floatDelay: 0,
  },
  {
    id: 'card-3',
    src: 'https://images.unsplash.com/photo-1518398046578-8cca57782e17?auto=format&fit=crop&w=800&q=80',
    altKey: 'cards.card3Alt',
    frameClassName: `${styles.cardFrame} ${styles.cardBottom} w-[11.4rem] md:w-[12.6rem] lg:w-[15rem] xl:w-[16rem]`,
    entryDelay: staggerDelays.thirdCard,
    floatY: -10,
    floatDuration: 6.2,
    floatDelay: 0.6,
  },
] as const;

const languageOptions: Array<{
  code: AppLanguage;
  flag: string;
  labelKey: 'language.english' | 'language.spanish';
  shortLabel: 'EN' | 'ES';
}> = [
  { code: 'en', flag: '🇺🇸', labelKey: 'language.english', shortLabel: 'EN' },
  { code: 'es', flag: '🇳🇮', labelKey: 'language.spanish', shortLabel: 'ES' },
];

export function SignInPage() {
  const { t, i18n } = useTranslation('auth');
  const loginWithGoogleMutation = useLoginWithGoogle();
  const shouldReduceMotion = useReducedMotion();
  const currentLanguage: AppLanguage = i18n.language.startsWith('es') ? 'es' : 'en';
  const entranceVariants = shouldReduceMotion ? reducedMotionVariants : revealVariants;
  const cardVariants = shouldReduceMotion ? reducedMotionVariants : cardEntryVariants;

  return (
    <motion.main
      variants={shouldReduceMotion ? reducedMotionVariants : pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-auth-canvas px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
    >
      <motion.section
        variants={shouldReduceMotion ? reducedMotionVariants : panelVariants}
        className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[78rem] overflow-hidden rounded-[1.45rem] border border-auth-border bg-auth-surface shadow-auth md:min-h-[calc(100vh-3rem)] md:rounded-[1.75rem]"
      >
        <div className="grid w-full gap-8 px-5 py-8 min-[360px]:px-6 sm:p-10 lg:grid-cols-[1fr_1.03fr] lg:gap-6 lg:px-14 lg:py-12 xl:px-16">
          <div className="flex flex-col justify-center">
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
                          ? 'bg-auth-button text-auth-button-text'
                          : 'text-auth-brand hover:bg-auth-brand/10'
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

            <motion.div
              variants={shouldReduceMotion ? reducedMotionVariants : brandVariants}
              custom={staggerDelays.brand}
              className="mb-8 text-center lg:mb-10 lg:text-left"
            >
              <p className="inline-flex items-center gap-3 font-serif text-[2.1rem] leading-none tracking-[-0.02em] text-auth-brand sm:text-[2.45rem]">
                <FaHeart className="text-[0.78em]" aria-hidden="true" />
                <span>{t('brand')}</span>
              </p>
            </motion.div>

            <div className="mx-auto w-full max-w-[31rem] text-center lg:mx-0 lg:text-left">
              <motion.h1
                variants={shouldReduceMotion ? reducedMotionVariants : headingVariants}
                custom={staggerDelays.heading}
                className="font-display text-[2.8rem] leading-[0.95] tracking-[-0.02em] text-auth-heading sm:text-[3.2rem] md:text-[3.35rem] lg:text-[3.7rem]"
              >
                {t('heading')}
              </motion.h1>
              <motion.p
                variants={entranceVariants}
                custom={staggerDelays.description}
                className="mt-5 text-lg leading-relaxed text-auth-copy sm:text-[1.36rem] md:max-w-[30rem]"
              >
                {t('description')}
              </motion.p>

              <motion.div
                variants={shouldReduceMotion ? reducedMotionVariants : buttonVariants}
                custom={staggerDelays.button}
                className="mt-10"
              >
                <Button
                  onClick={() => loginWithGoogleMutation.mutate()}
                  loading={loginWithGoogleMutation.isPending}
                >
                  <FcGoogle className="h-6 w-6" aria-hidden="true" />
                  {t('continueWithGoogle')}
                </Button>
              </motion.div>

              <motion.p
                variants={entranceVariants}
                custom={staggerDelays.legal}
                className="mt-8 text-xs uppercase tracking-[0.13em] text-auth-legal sm:text-[0.82rem]"
              >
                {t('legal')}
              </motion.p>
            </div>
          </div>

          <motion.div
            variants={entranceVariants}
            custom={staggerDelays.cardStage}
            className="relative mx-auto h-[20.5rem] w-full max-w-[24rem] sm:h-[22rem] sm:max-w-[26rem] md:h-[23.5rem] md:max-w-[31rem] lg:h-auto lg:max-w-none"
          >
            {memoryCards.map((card) => (
              <div key={card.id} className={card.frameClassName}>
                <motion.div variants={cardVariants} custom={card.entryDelay}>
                  <div className={styles.cardTilt}>
                    <motion.figure
                      animate={shouldReduceMotion ? undefined : { y: [0, card.floatY, 0] }}
                      transition={
                        shouldReduceMotion
                          ? undefined
                          : {
                              delay: card.floatDelay ?? 0,
                              duration: card.floatDuration,
                              ease: 'easeInOut',
                              repeat: Number.POSITIVE_INFINITY,
                            }
                      }
                      className={styles.card}
                    >
                      <img
                        src={card.src}
                        alt={t(card.altKey)}
                        loading="lazy"
                        className={styles.cardImage}
                      />
                    </motion.figure>
                  </div>
                </motion.div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>
    </motion.main>
  );
}
