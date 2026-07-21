"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { JOIN_SPACE_STORAGE_KEY } from "../constants/local-storage";
import { createJoinSpaceSetupSchema } from "../constants/validation";
import { SPACE_SETUP_STEPS } from "../constants/welcome-steps";
import type { SpaceSetupJoinSteps } from "../types/setup-types";
import { useSpaceSetupStorage } from "./use-space-setup-storage";

export type JoinSpaceSetupFormValues = {
  displayName: string;
  inviteCode: string;
};

const initialJoinFormValues: JoinSpaceSetupFormValues = {
  displayName: "",
  inviteCode: "",
};

const joinSetupSteps = [SPACE_SETUP_STEPS.JOIN_CODE, SPACE_SETUP_STEPS.JOIN_NAME] as const;

const joinStepRequirements: Record<SpaceSetupJoinSteps, SpaceSetupJoinSteps[]> = {
  [SPACE_SETUP_STEPS.JOIN_CODE]: [],
  [SPACE_SETUP_STEPS.JOIN_NAME]: [SPACE_SETUP_STEPS.JOIN_CODE],
};

const joinStepRoutes: Record<SpaceSetupJoinSteps, string> = {
  [SPACE_SETUP_STEPS.JOIN_CODE]: APP_ROUTES.WELCOME_JOIN_STEP("code"),
  [SPACE_SETUP_STEPS.JOIN_NAME]: APP_ROUTES.WELCOME_JOIN_STEP("name"),
};

function findMissingJoinStep(screen: SpaceSetupJoinSteps, completedSteps: SpaceSetupJoinSteps[]) {
  return joinStepRequirements[screen].find(
    (requiredStep) => !completedSteps.includes(requiredStep),
  );
}

export function useJoinSpaceSetupForm(screen: SpaceSetupJoinSteps) {
  const { t } = useTranslation("spaceSetup");
  const router = useRouter();
  const storage = useSpaceSetupStorage<JoinSpaceSetupFormValues, SpaceSetupJoinSteps>({
    initialValues: initialJoinFormValues,
    steps: joinSetupSteps,
    storageKey: JOIN_SPACE_STORAGE_KEY,
  });
  const form = useForm<JoinSpaceSetupFormValues>({
    defaultValues: storage.values,
    resolver: zodResolver(createJoinSpaceSetupSchema(t)),
  });
  const hasAppliedStoredValues = useRef(false);
  const isAllowed = !findMissingJoinStep(screen, storage.completedSteps);

  useEffect(() => {
    if (storage.hasLoaded && !hasAppliedStoredValues.current) {
      hasAppliedStoredValues.current = true;
      form.reset(storage.values);
    }
  }, [form, storage.hasLoaded, storage.values]);

  useEffect(() => {
    if (!storage.hasLoaded) {
      return;
    }

    const subscription = form.watch((nextValues) => {
      storage.setValues({
        displayName: nextValues.displayName ?? "",
        inviteCode: nextValues.inviteCode ?? "",
      });
    });

    return () => subscription.unsubscribe();
  }, [form, storage.hasLoaded, storage.setValues]);

  useEffect(() => {
    if (!storage.hasLoaded) {
      return;
    }

    const missingStep = findMissingJoinStep(screen, storage.completedSteps);

    if (missingStep) {
      router.replace(joinStepRoutes[missingStep]);
    }
  }, [router, screen, storage.completedSteps, storage.hasLoaded]);

  return {
    ...storage,
    form,
    isAllowed,
  };
}
