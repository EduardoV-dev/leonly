"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { CREATE_SPACE_STORAGE_KEY } from "../constants/local-storage";
import { createCreateSpaceSetupSchema } from "../constants/validation";
import { SPACE_SETUP_STEPS } from "../constants/welcome-steps";
import type { SpaceSetupCreateSteps } from "../types/setup-types";
import { useSpaceSetupStorage } from "./use-space-setup-storage";

export type CreateSpaceSetupFormValues = {
  displayName: string;
  firstDay: string;
  spaceName: string;
};

const initialCreateFormValues: CreateSpaceSetupFormValues = {
  displayName: "",
  firstDay: "",
  spaceName: "",
};

const createSetupSteps = [
  SPACE_SETUP_STEPS.CREATE_START,
  SPACE_SETUP_STEPS.CREATE_NAME,
  SPACE_SETUP_STEPS.CREATE_DATE,
  SPACE_SETUP_STEPS.CREATE_INVITE,
] as const;

const createStepRequirements: Record<SpaceSetupCreateSteps, SpaceSetupCreateSteps[]> = {
  [SPACE_SETUP_STEPS.CREATE_START]: [],
  [SPACE_SETUP_STEPS.CREATE_NAME]: [SPACE_SETUP_STEPS.CREATE_START],
  [SPACE_SETUP_STEPS.CREATE_DATE]: [SPACE_SETUP_STEPS.CREATE_START, SPACE_SETUP_STEPS.CREATE_NAME],
  [SPACE_SETUP_STEPS.CREATE_INVITE]: [
    SPACE_SETUP_STEPS.CREATE_START,
    SPACE_SETUP_STEPS.CREATE_NAME,
    SPACE_SETUP_STEPS.CREATE_DATE,
  ],
};

const createStepRoutes: Record<SpaceSetupCreateSteps, string> = {
  [SPACE_SETUP_STEPS.CREATE_START]: APP_ROUTES.WELCOME_CREATE_STEP("start"),
  [SPACE_SETUP_STEPS.CREATE_NAME]: APP_ROUTES.WELCOME_CREATE_STEP("name"),
  [SPACE_SETUP_STEPS.CREATE_DATE]: APP_ROUTES.WELCOME_CREATE_STEP("date"),
  [SPACE_SETUP_STEPS.CREATE_INVITE]: APP_ROUTES.WELCOME_CREATE_STEP("invite"),
};

function findMissingCreateStep(
  screen: SpaceSetupCreateSteps,
  completedSteps: SpaceSetupCreateSteps[],
) {
  return createStepRequirements[screen].find(
    (requiredStep) => !completedSteps.includes(requiredStep),
  );
}

export function useCreateSpaceSetupForm(screen: SpaceSetupCreateSteps) {
  const { t } = useTranslation("spaceSetup");
  const router = useRouter();
  const storage = useSpaceSetupStorage<CreateSpaceSetupFormValues, SpaceSetupCreateSteps>({
    initialValues: initialCreateFormValues,
    steps: createSetupSteps,
    storageKey: CREATE_SPACE_STORAGE_KEY,
  });
  const form = useForm<CreateSpaceSetupFormValues>({
    defaultValues: storage.values,
    resolver: zodResolver(createCreateSpaceSetupSchema(t)),
  });
  const hasAppliedStoredValues = useRef(false);
  const isAllowed = !findMissingCreateStep(screen, storage.completedSteps);

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
        firstDay: nextValues.firstDay ?? "",
        spaceName: nextValues.spaceName ?? "",
      });
    });

    return () => subscription.unsubscribe();
  }, [form, storage.hasLoaded, storage.setValues]);

  useEffect(() => {
    if (!storage.hasLoaded) {
      return;
    }

    const missingStep = findMissingCreateStep(screen, storage.completedSteps);

    if (missingStep) {
      router.replace(createStepRoutes[missingStep]);
    }
  }, [router, screen, storage.completedSteps, storage.hasLoaded]);

  return {
    ...storage,
    form,
    isAllowed,
  };
}
