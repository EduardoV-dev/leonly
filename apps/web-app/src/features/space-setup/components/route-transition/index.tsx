"use client";

import { APP_ROUTES } from "@/constants/routes";
import { AnimatePresence, type Variants, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

type Direction = "forward" | "back";

type SpaceSetupRouteTransitionProps = {
  children: ReactNode;
};

const routeOrder: Record<string, number> = {
  [APP_ROUTES.WELCOME]: 0,
  [APP_ROUTES.WELCOME_CREATE]: 0,
  [APP_ROUTES.WELCOME_CREATE_STEP("start")]: 0,
  [APP_ROUTES.WELCOME_CREATE_STEP("name")]: 1,
  [APP_ROUTES.WELCOME_CREATE_STEP("date")]: 2,
  [APP_ROUTES.WELCOME_CREATE_STEP("invite")]: 3,
  [APP_ROUTES.WELCOME_JOIN]: 0,
  [APP_ROUTES.WELCOME_JOIN_STEP("code")]: 0,
  [APP_ROUTES.WELCOME_JOIN_STEP("name")]: 1,
};

const shellVariants: Variants = {
  enter: {
    opacity: 1,
  },
  center: {
    opacity: 1,
    transition: { duration: 0 },
  },
  exit: {
    opacity: 1,
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  },
};

const reducedMotionVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

export function SpaceSetupRouteTransition({ children }: SpaceSetupRouteTransitionProps) {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const [direction, setDirection] = useState<Direction>("forward");
  const shouldReduceMotion = useReducedMotion();
  const activeVariants = shouldReduceMotion ? reducedMotionVariants : shellVariants;

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }

    const previousOrder = routeOrder[previousPathnameRef.current] ?? 0;
    const nextOrder = routeOrder[pathname] ?? previousOrder;

    setDirection(nextOrder >= previousOrder ? "forward" : "back");
    previousPathnameRef.current = pathname;
  }, [pathname]);

  return (
    <div className="min-h-screen bg-auth-canvas">
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={pathname}
          className="min-h-screen"
          custom={direction}
          variants={activeVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
