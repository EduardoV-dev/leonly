import type { AppLanguage } from "@/lib/i18n";
import type { Variants } from "motion/react";

export const revealEase = [0.22, 1, 0.36, 1] as const;
export const headingEase = [0.2, 0.9, 0.22, 1] as const;
export const popEase = [0.18, 1.25, 0.4, 1] as const;
export const cardEase = [0.18, 1.05, 0.3, 1] as const;

export const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.42, ease: "easeOut" } },
};

export const panelVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.62, ease: revealEase },
  },
};

export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(8px)" },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay, duration: 0.52, ease: revealEase },
  }),
};

export const brandVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay, duration: 0.56, ease: revealEase },
  }),
};

export const headingVariants: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay, duration: 0.64, ease: headingEase },
  }),
};

export const buttonVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay, duration: 0.58, ease: popEase },
  }),
};

export const cardEntryVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.88, filter: "blur(10px)" },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { delay, duration: 0.72, ease: cardEase },
  }),
};

export const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

export const staggerDelays = {
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

export const memoryCards = [
  {
    id: "card-1",
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    altKey: "cards.card1Alt",
    positionClassName: "cardTop",
    widthClassName: "w-[12.6rem] md:w-[13.4rem] lg:w-[16rem] xl:w-[17.2rem]",
    entryDelay: staggerDelays.firstCard,
    floatY: -10,
    floatDuration: 7.4,
    floatDelay: 0,
  },
  {
    id: "card-2",
    src: "https://images.unsplash.com/photo-1501901609772-df0848060b33?auto=format&fit=crop&w=800&q=80",
    altKey: "cards.card2Alt",
    positionClassName: "cardMiddle",
    widthClassName: "w-[10.8rem] md:w-[12.2rem] lg:w-[13.6rem] xl:w-[14.4rem]",
    entryDelay: staggerDelays.secondCard,
    floatY: 10,
    floatDuration: 6.8,
    floatDelay: 0,
  },
  {
    id: "card-3",
    src: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80",
    altKey: "cards.card3Alt",
    positionClassName: "cardBottom",
    widthClassName: "w-[11.4rem] md:w-[12.6rem] lg:w-[15rem] xl:w-[16rem]",
    entryDelay: staggerDelays.thirdCard,
    floatY: -10,
    floatDuration: 6.2,
    floatDelay: 0.6,
  },
] as const;

export const languageOptions: Array<{
  code: AppLanguage;
  flag: string;
  labelKey: "language.english" | "language.spanish";
  shortLabel: "EN" | "ES";
}> = [
  { code: "en", flag: "\u{1F1FA}\u{1F1F8}", labelKey: "language.english", shortLabel: "EN" },
  { code: "es", flag: "\u{1F1F3}\u{1F1EE}", labelKey: "language.spanish", shortLabel: "ES" },
];
