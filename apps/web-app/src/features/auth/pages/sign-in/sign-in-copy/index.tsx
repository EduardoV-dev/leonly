import { motion, type Variants } from "motion/react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import {
  buttonVariants,
  headingVariants,
  reducedMotionVariants,
  staggerDelays,
} from "../constants";

type SignInCopyProps = {
  entranceVariants: Variants;
  isLoginPending: boolean;
  onLogin: () => void;
  shouldReduceMotion: boolean;
  t: (key: string) => string;
};

export function SignInCopy({
  entranceVariants,
  isLoginPending,
  onLogin,
  shouldReduceMotion,
  t,
}: SignInCopyProps) {
  return (
    <div className="mx-auto w-full max-w-[31rem] text-center lg:mx-0 lg:text-left">
      <motion.h1
        variants={shouldReduceMotion ? reducedMotionVariants : headingVariants}
        custom={staggerDelays.heading}
        className="font-display font-semibold text-[2.8rem] leading-[0.95] text-auth-heading sm:text-[3.2rem] md:text-[3.35rem] lg:text-[3.7rem]"
      >
        {t("heading")}
      </motion.h1>
      <motion.p
        variants={entranceVariants}
        custom={staggerDelays.description}
        className="mt-5 text-lg leading-relaxed text-auth-copy sm:text-[1.36rem] md:max-w-[30rem]"
      >
        {t("description")}
      </motion.p>

      <motion.div
        variants={shouldReduceMotion ? reducedMotionVariants : buttonVariants}
        custom={staggerDelays.button}
        className="mt-10"
      >
        <Button onClick={onLogin} loading={isLoginPending}>
          <FcGoogle className="h-6 w-6" aria-hidden="true" />
          {t("continueWithGoogle")}
        </Button>
      </motion.div>

      <motion.p
        variants={entranceVariants}
        custom={staggerDelays.legal}
        className="mt-8 text-xs uppercase tracking-[0.13em] text-auth-legal sm:text-[0.82rem]"
      >
        {t("legal")}
      </motion.p>
    </div>
  );
}
